"""Fetch explicitly selected TrainTrack archives and extract only the requested sensor CSVs."""
import argparse
import hashlib
import json
import re
import shutil
import tempfile
import urllib.request
import zipfile
from pathlib import Path

BASE = 'https://zenodo.org/records/22206115/files/'
SENSORS = ('Accelerometer.csv', 'Gravity.csv', 'Gyroscope.csv')
ARCHIVE = re.compile(r'traintrack_data_(00[1-9]|01[0-5])\.zip\Z')
MAX_MEMBER = 2 * 1024**3


def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def safe_path(root, value):
    path = (root / value).resolve()
    if not path.is_relative_to(root.resolve()) or path == root.resolve():
        raise ValueError(f'Path outside dataset root: {value}')
    return path


def download(name, dest, limit):
    dest.parent.mkdir(parents=True, exist_ok=True)
    part = dest.with_suffix(dest.suffix + '.part')
    try:
        with urllib.request.urlopen(BASE + name + '?download=1', timeout=60) as response, part.open('wb') as out:
            total = 0
            while chunk := response.read(1024 * 1024):
                total += len(chunk)
                if total > limit:
                    raise ValueError('Download size limit exceeded')
                out.write(chunk)
        part.replace(dest)
    finally:
        part.unlink(missing_ok=True)


def extract_sensors(archive, inner, members, dest):
    if set(members) != set(SENSORS):
        raise ValueError('Provide exact archive member names for all three sensors')
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=dest.parent) as tmp:
        temporary = Path(tmp)
        with zipfile.ZipFile(archive) as outer:
            if inner is None:
                extract_from(outer, members, temporary)
            else:
                info = outer.getinfo(inner)
                if info.file_size > MAX_MEMBER:
                    raise ValueError('Nested recording exceeds size limit')
                with outer.open(info) as source, (temporary / 'inner.zip').open('wb') as target:
                    shutil.copyfileobj(source, target)
                with zipfile.ZipFile(temporary / 'inner.zip') as recording:
                    extract_from(recording, members, temporary)
        for name in SENSORS:
            (temporary / name).replace(dest / name)


def extract_from(archive, members, dest):
    for name, member in members.items():
        info = archive.getinfo(member)
        if info.is_dir() or info.file_size > MAX_MEMBER:
            raise ValueError(f'Invalid or oversized member: {member}')
        with archive.open(info) as source, (dest / name).open('wb') as target:
            shutil.copyfileobj(source, target)


def prepare(manifest, split, allow_download=False, max_archives=1):
    manifest = Path(manifest).resolve()
    root = manifest.parent
    cases = json.loads(manifest.read_text())['cases']
    chosen = [c for c in cases if c['split'] == split and c.get('traintrack')]
    if not chosen:
        return
    cache = root / '.traintrack-cache'
    cache.mkdir(exist_ok=True)
    missing = set()
    for case in chosen:
        spec = case['traintrack']
        name = spec['archive']
        if not ARCHIVE.fullmatch(name):
            raise ValueError(f'Unknown TrainTrack archive: {name}')
        if not (cache / name).is_file():
            missing.add(name)
    if missing and (not allow_download or len(missing) > max_archives):
        raise ValueError(f'{len(missing)} archives missing; use --download with an explicit archive budget')
    checksums = cache / 'sha256sums.txt'
    if not checksums.is_file():
        if not allow_download:
            raise ValueError('Official checksum manifest missing')
        download('sha256sums.txt', checksums, 1024 * 1024)
    hashes = {}
    for line in checksums.read_text().splitlines():
        match = re.fullmatch(r'([0-9a-fA-F]{64})\s+\*?(.+)', line)
        if match:
            hashes[Path(match[2]).name] = match[1].lower()
    verified = set()
    for case in chosen:
        spec = case['traintrack']
        name = spec['archive']
        path = cache / name
        if name not in hashes:
            raise ValueError(f'No official checksum: {name}')
        if not path.is_file():
            download(name, path, 12_000_000_000)
        if name not in verified:
            if digest(path) != hashes[name]:
                raise ValueError(f'Checksum mismatch: {path}')
            verified.add(name)
        extract_sensors(path, spec.get('innerZip'), spec['members'], safe_path(root, case['directory']))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest')
    parser.add_argument('split', choices=['train', 'validation', 'test'])
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--max-archives', type=int, default=1)
    args = parser.parse_args()
    prepare(args.manifest, args.split, args.download, args.max_archives)
