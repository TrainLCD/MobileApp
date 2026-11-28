"""Compare magnetic variation at IMU decisions and replay a one-sided stop veto."""
import argparse
import json
import csv
import subprocess
import tempfile
from pathlib import Path

import numpy as np

import running_baseline as base

HERE = Path(__file__).resolve().parent


def read(path):
    return json.loads(path.read_text())


def route(name, directory, key, data, *, optional_field=False):
    stations = {'shinjuku': ('曙橋', '市ヶ谷', '九段下', '神保町', '小川町'),
                'namboku': ('六本木一丁目', '溜池山王'), 'oedo': ('豊島園',)}
    if name in stations:
        return list(zip(stations[name], data['marks'][::2], data['marks'][1::2], strict=True)), None
    segments = read(directory / 'cropped' / key / 'segments.json')
    field = directory / 'recordings' / segments[0]['zip_file'] / 'Magnetometer.csv'
    legs = [(item['segment'], float(item['start_timestamp']), float(item['end_timestamp']))
            for item in segments]
    if optional_field and not field.exists():
        return legs, None
    return legs, base.read_field(field)


def save(path, rows):
    with path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0])
        writer.writeheader()
        writer.writerows(rows)


def development_cutoff(entries, dataset):
    windows = []
    for entry in entries:
        config = entry['config']
        if 'journey' not in config:
            continue
        recording = Path(config['directory']).parent.name
        field = base.read_field(dataset / 'recordings' / recording / 'Magnetometer.csv')
        pair = base.labelled_windows(field, config['departureMs'] / 1000,
                                       config['arrivalMs'] / 1000, entry['observations'][-1][0])
        windows.append((recording, pair))
    return base.calibrate(windows)


class Evidence:
    def __init__(self, samples, field, cutoff):
        raw = np.asarray(samples)
        self.clock = raw[:, 0]
        self.rotation = raw[:, 7]
        self.field = field
        self.cutoff = cutoff

    def windows(self, times):
        sd = (base.variability(self.field, times) if self.field is not None
              else np.full(len(times), np.nan))
        for t, value in zip(times, sd, strict=True):
            a = self.clock.searchsorted(t - 2)
            b = self.clock.searchsorted(t, side='right')
            rotation = np.nan
            if (b - a >= 8 and self.clock[0] <= t - 2
                    and np.diff(np.r_[t-2, self.clock[a:b], t]).max() <= .5):
                rotation = np.quantile(self.rotation[a:b], .9)
            mag_state = ('missing' if not np.isfinite(value) else
                         'active' if value > self.cutoff else 'quiet')
            gyro_state = ('missing' if not np.isfinite(rotation) else
                          'rotating' if rotation > 15 else 'usable')
            yield dict(magnetic_sd=value if np.isfinite(value) else None,
                       magnetic_state=mag_state,
                       gyro_q90_deg_s=rotation if np.isfinite(rotation) else None,
                       gyro_state=gyro_state,
                       veto_evidence=int(mag_state == 'active' and gyro_state == 'usable'))

    def revise(self, predictions):
        if self.field is None:
            return predictions
        windows = self.windows([t for t, _ in predictions])
        # The continuous detector uses the revision only once this entire
        # trailing window falls within the inferred run.
        return [[t, p, t-2, 0] if w['veto_evidence'] else [t, p]
                for (t, p), w in zip(predictions, windows, strict=True)]


def replay(directory, scores, estimator, tmp):
    scores_file, events_file = tmp / 'scores.json', tmp / 'events.json'
    scores_file.write_text(json.dumps(scores))
    subprocess.run(['node', HERE / 'imu-stop-continuous.mjs', estimator, directory / 'input.json',
                    scores_file, events_file], check=True)
    return read(events_file)


def score_leg(spans, events, departure, arrival, end, next_observed):
    stops = {t for t, kind in events if kind == 'stop'}
    early = sorted(t for t in stops if departure + 5 < t < arrival - 5)
    timely = None
    if next_observed:
        timely = next((b for i, (a, b) in enumerate(spans)
                       if a < b < end and abs(b - arrival) <= 5
                       and (i + 1 == len(spans) or spans[i + 1][0] >= end)), None)
    moving = [(max(a, arrival), min(b, end)) for a, b in spans if max(a, arrival) < min(b, end)]
    first = moving[0][1] if moving and moving[0][0] == arrival else arrival
    if end <= arrival:
        outcome = 'unobserved'
    elif first == end:
        outcome = 'missed'
    elif any(a > first for a, _ in moving):
        outcome = 'restarted'
    else:
        outcome = 'held_to_end'
    state = dict(confirmed_stops_in_run=len(early),
                 early_stop_lead_s=' '.join(f'{arrival-t:.3f}' for t in early),
                 timely_stop_held_to_next_departure=int(timely is not None) if next_observed else '',
                 dwell_result=outcome, first_stopped_s=round(first-arrival, 4) if first < end else '',
                 running_in_run_s=base.duration(spans, departure, arrival),
                 running_in_dwell_s=base.duration(spans, arrival, end))
    decisions = [(t, 'early_confirmed', True) for t in early]
    if timely is not None:
        decisions.append((timely, 'timely_held', timely in stops))
    return state, decisions


def compare_track(identity, samples, legs, evidence, models, baseline, revised):
    features = base.features(samples, evidence.field)
    arms = [(label, events, base.running_spans(samples, events, features, models))
            for label, events in [('baseline', baseline), ('magnetic', revised)]]
    traces, paired = [], []
    clock = evidence.clock
    for i, (leg, departure, arrival) in enumerate(legs):
        if clock.searchsorted(departure) == clock.searchsorted(arrival):
            continue
        departure = max(departure, clock[0])
        next_observed = i+1 < len(legs) and legs[i+1][1] <= clock[-1]
        end = legs[i+1][1] if next_observed else clock[-1]
        row = dict(**identity, leg=leg, run_s=round(arrival-departure, 3),
                   dwell_s=round(end-arrival, 3), has_next_departure=int(next_observed))
        for label, events, spans in arms:
            state, decisions = score_leg(spans, events, departure, arrival, end, next_observed)
            row.update({f'{label}_{key}': value for key, value in state.items()})
            if label == 'baseline':
                for t, kind, confirmed in decisions:
                    traces.append(dict(**identity, leg=leg, kind=kind, confirmed=int(confirmed),
                                       decision_s=t, arrival_offset_s=round(t-arrival, 4),
                                       **next(evidence.windows([t]))))
        paired.append(row)
    return traces, paired


def public_ids(directory):
    segments = [s for p in (directory/'cropped').glob('*/segments.json') for s in read(p)]
    return [{s[key] for s in segments} for key in ('zip_file', 'journey_id', 'trip_id')]


def run(dataset, extra, output, check_domestic):
    snapshot = dataset / 'handoff-2026-11-28'
    entries = read(snapshot / 'development.json')
    cutoff = development_cutoff(entries, dataset)
    print('Development magnetic SD cutoff:', cutoff)
    models = base.train(entries, dataset)
    public = {'public': snapshot / 'public-eval', 'validation': dataset / 'recovery-validation',
              'diagnostic': dataset / 'recovery-diagnostic-validation', 'holdout': dataset / 'stop-release-validation'}
    if extra:
        public['new_public'] = extra
    development = [e['config'] for e in entries if 'journey' in e['config']]
    used = [{Path(c['directory']).parent.name for c in development},
            {str(c['journey']) for c in development}, {str(c['trip']) for c in development}]
    for cohort, directory in public.items():
        for seen, ids in zip(used, public_ids(directory), strict=True):
            if seen & ids:
                raise ValueError(f'{cohort} overlaps a previous recording, journey or trip')
            seen.update(ids)
    directories = dict(public)
    if check_domestic:
        directories.update(shinjuku=snapshot / 'shinjuku', oedo=dataset / 'marked-oedo-replay',
                           namboku=dataset / 'marked-namboku-replay')
    traces, paired = [], []
    with tempfile.TemporaryDirectory() as tmp:
        for cohort, directory in directories.items():
            data = read(directory / 'input.json')
            predictions = read(directory / 'probs.json')
            archive = read(directory / 'continuous.json')
            keys = list(archive)
            if cohort == 'shinjuku':
                keys = ['full0']
            elif cohort == 'namboku':
                keys = [f'full{i}' for i in range(10)]
            baseline_scores = {k: predictions[k] for k in keys}
            baseline = replay(directory, baseline_scores, snapshot / 'runtime/imuShadow.js', Path(tmp))
            if any(baseline[k] != archive[k] for k in keys):
                raise ValueError(f'{cohort} differs from its archived baseline')
            records, revised_scores = {}, {}
            for k in keys:
                legs, field = route(cohort, directory, k, data, optional_field=cohort == 'new_public')
                samples = data['sets'][k]['samples']
                evidence = Evidence(samples, field, cutoff)
                records[k] = samples, legs, evidence
                revised_scores[k] = evidence.revise(predictions[k])
            revised = replay(directory, revised_scores, snapshot / 'runtime/imuShadow.js', Path(tmp))
            for k, (samples, legs, evidence) in records.items():
                if evidence.field is None and revised[k] != baseline[k]:
                    raise ValueError(f'{cohort}/{k} changed without magnetic input')
                if cohort not in public:
                    continue
                events, rows = compare_track(dict(cohort=cohort, track=k), samples, legs, evidence,
                                             models, baseline[k], revised[k])
                traces.extend(events)
                paired.extend(rows)
    output.mkdir(exist_ok=True, parents=True)
    save(output/'imu-magnetic-stop-events.csv', traces)
    save(output/'imu-magnetic-stop-pairs.csv', paired)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, required=True)
    parser.add_argument('--extra-public', type=Path, help='Additional prepared, disjoint TrainTrack cohort')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--check-domestic', action='store_true', help='Also verify archived non-magnetic domestic event streams')
    args = parser.parse_args()
    run(args.dataset, args.extra_public, args.output_dir, args.check_domestic)
