import * as dayjs from 'dayjs';
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
        const isDisconnected =
          dayjs(visitor.timestamp).diff(new Date(), 'minutes') > 2;
        if (isDisconnected) {
          visitorSnapshot.ref.update({
            inactive: true,
          });
        }
      })
    );
    return null;
  });
