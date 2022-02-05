import { initializeApp } from 'firebase-admin';
import * as functions from 'firebase-functions';

const app = initializeApp();

exports.detectInactiveSubscribers = functions.pubsub
  .schedule('every 3 minutes')
  .onRun(async () => {
    const visitorsRef = app.database().ref('/mirroringShare/visitors');
    const visitorsSnapshot = await visitorsRef.get();
    visitorsSnapshot.forEach((shareSessionSnapshot) =>
      shareSessionSnapshot.forEach((visitorSnapshot) => {
        const visitor = visitorSnapshot.val();
        const diff =
          new Date(visitor.timestamp).getTime() - new Date().getTime();
        const isDisconnected = diff / (60 * 1000) < -1;
        if (isDisconnected && !visitor.inactive) {
          visitorSnapshot.ref.update({
            inactive: true,
          });
        }
      })
    );
    return null;
  });
