"""Running intervals used for both arms of the offline magnetic stop comparison."""
import csv
from collections import Counter, defaultdict
from functools import lru_cache
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler


@lru_cache(maxsize=6)
def read_field(path):
    with path.open() as f:
        cols = next(csv.reader(f))
        names = ('seconds_from_journey_start', 'x', 'y', 'z')
        rows = np.loadtxt(f, delimiter=',', usecols=[cols.index(n) for n in names], ndmin=2)
    rows = rows[np.isfinite(rows).all(axis=1)]
    if np.any(np.diff(rows[:, 0]) < 0):
        raise ValueError(f'Magnetic time moved backwards in {path}')
    return rows[:, 0].copy(), np.linalg.norm(rows[:, 1:], axis=1)


def variability(field, times):
    clock, magnitude = field
    times = np.asarray(times)
    left = clock.searchsorted(times-2)
    right = clock.searchsorted(times, side='right')
    values = np.full(len(times), np.nan)
    for i, (a, b) in enumerate(zip(left, right)):
        if b-a >= 4 and np.diff(np.r_[times[i]-2, clock[a:b], times[i]]).max() <= .5:
            values[i] = magnitude[a:b].std()
    return values


def labelled_windows(field, departure, arrival, end):
    # Sample once per second. Both endpoints of every two-second window
    # must lie in its labelled period, clear of the departure/arrival boundary.
    moving = np.arange(departure+7, arrival-5, 1)
    stopped = np.arange(arrival+4, min(end, arrival+10)+1e-7, 1)
    return variability(field, moving), variability(field, stopped)


def calibrate(records):
    # Each training recording has equal influence, regardless of duration.
    windows = defaultdict(lambda: [[], []])
    for recording, pair in records:
        for state, values in enumerate(pair):
            windows[recording][state].extend(values[np.isfinite(values)])
    if not windows or any(not len(v) for pair in windows.values() for v in pair):
        raise ValueError('Insufficient labelled magnetic coverage for calibration')
    stops = np.concatenate([pair[1] for pair in windows.values()])
    weights = np.concatenate([np.full(len(v), 1/len(v)) for _, v in windows.values()])
    order = np.argsort(stops)
    cutoff = stops[order[np.searchsorted(np.cumsum(weights[order]), weights.sum()/2)]]
    return cutoff


def features(samples, field=None):
    raw = np.asarray(samples)
    clock, accel, gravity = raw[:, 0], raw[:, 1:4], raw[:, 4:7]
    norm = np.linalg.norm(gravity, axis=1, keepdims=True)
    up = np.divide(gravity, norm, out=np.full_like(gravity, np.nan), where=norm > 0)
    vertical = (accel*up).sum(axis=1)
    horizontal = np.linalg.norm(accel-up*vertical[:, None], axis=1)
    times = np.arange(np.ceil(clock[0]+2), np.floor(clock[-1])+1)
    values = np.full((len(times), 3), np.nan)
    gyro = np.full(len(times), np.nan)
    if field is not None:
        values[:, 2] = variability(field, times)
    for i, t in enumerate(times):
        lo, hi = clock.searchsorted(t-2, side='left'), clock.searchsorted(t, side='right')
        if hi-lo < 8 or np.diff(np.r_[t-2, clock[lo:hi], t]).max() > .5:
            continue
        values[i, :2] = [vertical[lo:hi].std(), horizontal[lo:hi].std()]
        gyro[i] = np.quantile(raw[lo:hi, 7], .9)
    return times, np.log1p(values), gyro


def train(entries, dataset):
    xx, yy, recordings = [], [], []
    for entry in entries:
        c = entry['config']
        if 'journey' not in c:
            continue
        recording = Path(c['directory']).parent.name
        field = read_field(dataset/'recordings'/recording/'Magnetometer.csv')
        t, x, gyro = features(entry['observations'], field)
        dep, arr = c['departureMs']/1000, c['arrivalMs']/1000
        move = (t >= dep+7) & (t < arr-5)
        stop = (t >= arr+4) & (t <= arr+10)
        eligible = (gyro <= 15) & (move | stop)
        xx.extend(x[eligible])
        yy.extend(move[eligible])
        recordings.extend([recording]*eligible.sum())
    x, y, keys = np.array(xx), np.array(yy), np.array(recordings)
    models = {}
    for n in (2, 3):
        valid = np.isfinite(x[:, :n]).all(axis=1)
        groups = list(zip(keys[valid], y[valid]))
        counts = Counter(groups)
        per_state = Counter(state for _, state in counts)
        if len(per_state) != 2:
            raise ValueError('Both motion labels are required for training')
        # Give each class half the weight, shared equally among recordings that
        # have usable windows for that class after the device-motion filter.
        weights = np.array([1/(per_state[g[1]]*counts[g]) for g in groups])
        print(f'{n} features, eligible moving/stopped windows: {y[valid].sum()}/{(~y[valid]).sum()}')
        weights /= weights.mean()
        models[n] = make_pipeline(StandardScaler(), LogisticRegression()).fit(
            x[valid, :n], y[valid], standardscaler__sample_weight=weights,
            logisticregression__sample_weight=weights)
    return models


def running_evidence(x, gyro, models, magnetic):
    # Start with IMU alone and substitute the paired model only on valid magnetic windows.
    result = np.zeros(len(x))
    for n in ((2, 3) if magnetic else (2,)):
        valid = (gyro <= 15) & np.isfinite(x[:, :n]).all(axis=1)
        if valid.any():
            result[valid] = models[n].predict_proba(x[valid, :n])[:, 1]
    return result


def provisional(times, scores, stops, end, retain=False, imu_support=None, rotation_support=None):
    # Five consecutive one-second decisions, each based on the last two seconds.
    stops = np.asarray(stops)
    spans = []
    strong = scores >= .8
    last_normal = -np.inf
    for i in range(4, len(times)):
        t = times[i]
        j = stops.searchsorted(t, side='right')
        since_stop = t-stops[j-1] if j else np.inf
        recent = slice(i-4, i+1)
        supported = imu_support is None or np.count_nonzero(imu_support[recent]) >= 3
        entering = since_stop > 6 and strong[recent].all() and supported
        hold_rotation = (rotation_support is not None and rotation_support[i]
                         and t-last_normal <= 2)
        continuing = (retain and spans and spans[-1][1] == t and since_stop > 2
                      and (scores[i] >= .5 or hold_rotation))
        if not entering and not continuing:
            continue
        if scores[i] >= .5:
            last_normal = t
        # An ordinary IMU stop takes precedence immediately. Otherwise the signal
        # expires at the next tick unless the selected evidence rule still supports it.
        until = min(end, t+1, stops[j] if j < len(stops) else end)
        if t < until:
            spans.append((t, until))
    return spans


def union(spans):
    merged = []
    for a, b in sorted(spans):
        if merged and a <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(b, merged[-1][1]))
        else:
            merged.append((a, b))
    return merged


def duration(spans, a, b):
    return round(sum(max(0, min(right, b)-max(left, a)) for left, right in spans), 3)


def running_spans(samples, events, features, models):
    times, x, g = features
    original = [(t, events[i+1][0] if i+1 < len(events) else samples[-1][0])
                for i,(t, kind) in enumerate(events) if kind=='start']
    stops = [t for t,kind in events if kind=='stop']
    scores = running_evidence(x, g, models, True)
    imu = running_evidence(x, np.zeros_like(g), models, False)
    both = running_evidence(x, np.zeros_like(g), models, True)
    rotation = np.isfinite(g) & (g > 15) & np.isfinite(x).all(axis=1) & (imu >= .5) & (both >= .8)
    tentative = provisional(times, scores, stops, samples[-1][0], retain=True,
                                 imu_support=imu >= .5, rotation_support=rotation)
    return union(original+tentative)
