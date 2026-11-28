"""Export only the frozen forest's splits and leaf probabilities for mobile inference."""
import argparse
import hashlib
import json
import pickle
from pathlib import Path

DIGEST = 'bc1f18a33ee5fcfece02b6d452b459b92872fa4310bf83f7a8e682bcbd4a7db3'


def export(source, destination):
    data = source.read_bytes()
    if hashlib.sha256(data).hexdigest() != DIGEST:
        raise ValueError('Unexpected model digest')
    forest = pickle.loads(data)
    assert forest.n_features_in_ == 45 and list(forest.classes_) == [False, True]
    trees = []
    for estimator in forest.estimators_:
        tree = estimator.tree_
        # sklearn stores each left child immediately after its parent.
        nodes = []
        for i, (left, right) in enumerate(zip(tree.children_left, tree.children_right, strict=True)):
            if left < 0:
                weights = tree.value[i, 0]
                nodes.append([float(weights[1] / weights.sum())])
            else:
                assert left == i+1
                nodes.append([int(tree.feature[i]), float(tree.threshold[i]), int(right)])
        trees.append(nodes)
    destination.write_text(json.dumps(dict(sourceSha256=DIGEST, trees=trees), separators=(',', ':'))+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    export(args.source, args.destination)
