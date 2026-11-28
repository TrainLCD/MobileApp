import hashlib
import io
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from prepare import prepare, SENSORS


class PrepareTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.cache = self.root / '.traintrack-cache'
        self.cache.mkdir()
        self.archive = self.cache / 'traintrack_data_001.zip'
        nested = io.BytesIO()
        with zipfile.ZipFile(nested, 'w') as inner:
            for name in SENSORS:
                inner.writestr('sensor/' + name, 'seconds_elapsed,x,y,z\n0,0,0,0\n')
        with zipfile.ZipFile(self.archive, 'w') as outer:
            outer.writestr('recording.zip', nested.getvalue())
        checksum = hashlib.sha256(self.archive.read_bytes()).hexdigest()
        (self.cache / 'sha256sums.txt').write_text(f'{checksum}  {self.archive.name}\n')
        self.case = {'split': 'train', 'directory': 'ride', 'traintrack': {'archive': self.archive.name, 'innerZip': 'recording.zip', 'members': {name: 'sensor/' + name for name in SENSORS}}}

    def run_prepare(self, *other_cases):
        path = self.root / 'manifest.json'
        path.write_text(json.dumps({'cases': [self.case, *other_cases]}))
        prepare(path, 'train')

    def test_extracts_nested_csvs_only(self):
        self.run_prepare()
        self.assertEqual(sorted(p.name for p in (self.root / 'ride').iterdir()), sorted(SENSORS))

    def test_refuses_corrupt_archive(self):
        self.archive.write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError, 'Checksum mismatch'):
            self.run_prepare()

    def test_refuses_unapproved_download(self):
        self.archive.unlink()
        with self.assertRaisesRegex(ValueError, 'archives missing'):
            self.run_prepare()

    def test_refuses_output_path_escape(self):
        self.case['directory'] = '../outside'
        with self.assertRaisesRegex(ValueError, 'outside dataset root'):
            self.run_prepare()

    def test_refuses_directory_alias_across_splits_before_extraction(self):
        other = {'split': 'test', 'directory': './ride'}
        with self.assertRaisesRegex(ValueError, 'crosses splits'):
            self.run_prepare(other)
        self.assertFalse((self.root / 'ride').exists())

    def test_refuses_distinct_recordings_in_same_directory(self):
        other = {**self.case, 'directory': './ride', 'traintrack': {**self.case['traintrack'], 'innerZip': 'other.zip'}}
        with self.assertRaisesRegex(ValueError, 'different recordings'):
            self.run_prepare(other)
        self.assertFalse((self.root / 'ride').exists())

    def test_allows_segments_from_same_recording_in_same_split(self):
        self.run_prepare({**self.case, 'directory': './ride'})
        self.assertEqual(sorted(p.name for p in (self.root / 'ride').iterdir()), sorted(SENSORS))


if __name__ == '__main__':
    unittest.main()
