import csv
import tempfile
import unittest
from pathlib import Path

import numpy as np

from magnetic_stop import EVENT_COLUMNS, PAIR_COLUMNS, Evidence, compare_track, save
from running_baseline import read_field, train


class MagneticStopDecisionTest(unittest.TestCase):
    def setUp(self):
        self.clock = np.arange(41) / 10
        self.samples = np.zeros((len(self.clock), 8))
        self.samples[:, 0] = self.clock
        self.active = (self.clock, np.arange(len(self.clock)) % 2 * 10.)
        self.score = [[2., .7]]

    def test_active_uses_only_trailing_two_seconds(self):
        expected = [[2., .7, 0., 0]]
        past = self.clock <= 2
        self.active[1][~past] *= 100
        self.samples[~past, 7] = 90
        full = Evidence(self.samples, self.active, 1.)
        self.assertEqual(full.revise(self.score), expected)
        # Removing later spikes must leave both measurements unchanged.
        field = (self.clock[past], self.active[1][past])
        truncated = Evidence(self.samples[past], field, 1.)
        self.assertEqual(next(truncated.windows([2.])), next(full.windows([2.])))

    def test_missing_quiet_or_rotation_passes_original_probability(self):
        for field in (None, (self.clock, np.ones(len(self.clock))), (self.clock[::10], self.active[1][::10])):
            with self.subTest(field_present=field is not None):
                self.assertEqual(Evidence(self.samples, field, 1.).revise(self.score), self.score)
        self.samples[:, 7] = 16
        self.assertEqual(Evidence(self.samples, self.active, 1.).revise(self.score), self.score)
        self.samples[:, 7] = 0
        self.assertEqual(Evidence(self.samples[::10], self.active, 1.).revise(self.score), self.score)

    def test_eventless_track_exports_pairs_and_only_observed_dwell_times(self):
        samples = self.samples[:11].copy()
        samples[:, 6] = 9.81
        evidence = Evidence(samples, None, 1.)
        with tempfile.TemporaryDirectory() as tmp:
            events_path, pairs_path = Path(tmp) / 'events.csv', Path(tmp) / 'pairs.csv'
            for arrival, expected_dwell in [(1.5, ''), (1., ''), (.75, '0.25')]:
                with self.subTest(arrival=arrival):
                    traces, pairs = compare_track(dict(cohort='test', track='A'), samples,
                                                  [('B', 0., arrival)], evidence, {}, [], [])
                    save(events_path, EVENT_COLUMNS, traces)
                    save(pairs_path, PAIR_COLUMNS, pairs)
                    with events_path.open() as f:
                        self.assertEqual(list(csv.reader(f)), [list(EVENT_COLUMNS)])
                    with pairs_path.open() as f:
                        pair, = csv.DictReader(f)
                    self.assertEqual(pair['leg'], 'B')
                    self.assertEqual(pair['dwell_s'], expected_dwell)
                    self.assertEqual(pair['baseline_dwell_result'],
                                     'held_to_end' if expected_dwell else 'unobserved')

    def test_train_reports_when_rotation_excludes_all_labelled_windows(self):
        clock = np.arange(401) / 10
        samples = np.zeros((len(clock), 8))
        samples[:, 0], samples[:, 6], samples[:, 7] = clock, 9.81, 16
        entry = dict(config=dict(journey=1, directory='ride/leg', departureMs=0, arrivalMs=25000),
                     observations=samples)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'recordings' / 'ride' / 'Magnetometer.csv'
            path.parent.mkdir(parents=True)
            path.write_text('seconds_from_journey_start,x,y,z\n0,2,3,4\n')
            with self.assertRaisesRegex(ValueError, 'No eligible motion windows'):
                train([entry], Path(tmp))

    def test_sparse_recording_is_missing_at_decision(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'Magnetometer.csv'
            path.write_text('seconds_from_journey_start,x,y,z\n1,2,3,4\n')
            field = read_field(path)
            evidence = Evidence(self.samples, field, 1.)
            self.assertEqual(next(evidence.windows([2.]))['magnetic_state'], 'missing')
            self.assertEqual(evidence.revise(self.score), self.score)
