/* Creation origin is immutable. Delivery can hand off from automation to a coach. */
// Active manager identity for this local prototype; production supplies the signed-in user.
const currentManager = Object.freeze({ name: 'Alex Kim' });

function sessionDeliveryMode(session) {
  if (['automated', 'one_on_one'].includes(session?.deliveryMode)) return session.deliveryMode;
  return session?.origin === 'manual_override' || session?.state === 'manager_attention' ? 'one_on_one' : 'automated';
}

// Existing URL values remain valid; the visible Method filter follows current delivery.
function sessionMethodFilter(session) {
  return sessionDeliveryMode(session) === 'one_on_one' ? 'manual_override' : 'automated';
}

function handoffSessionToCoach(session, reason = 'manager_review') {
  if (!session || ['completed', 'archived'].includes(session.state)) return false;
  session.deliveryMode = 'one_on_one';
  session.state = reason === 'manager_review' ? 'system_handling' : 'manager_attention';
  session.attentionReason = reason === 'manager_review' ? null : reason;
  session.stateLabel = reason === 'manager_review' ? 'One-on-one' : 'Needs review';
  if (reason === 'driver_reply') {
    session.reviewRequested = true;
    session.scoreReviewExcluded = true;
  }
  session.history ||= [];
  session.history.unshift([reason === 'driver_reply' ? 'Driver requested review · one-on-one opened' : 'Handed off to one-on-one coaching', 'Just now']);
  return true;
}
