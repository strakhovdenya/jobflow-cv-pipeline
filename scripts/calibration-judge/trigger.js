'use strict';

const { authorizeLabel } = require('../label-authority');

// Decides whether Calibration Judge analyses a verifier round (ADR-044,
// ISSUE-630 amendment). The label name, the branch prefix and the event
// names come from the caller; nothing project-specific is fixed here.

const EVENT_ROUND = 'round';
const EVENT_LABELED = 'labeled';

const ANALYSED_VERDICTS = new Set(['FAIL', 'NEEDS_HUMAN']);

const run = (reason) => ({ run: true, reason });
const skip = (reason) => ({ run: false, reason });

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const extractIssueNumber = (branch, branchPrefix) => {
  if (typeof branch !== 'string' || typeof branchPrefix !== 'string') {
    return null;
  }
  if (branchPrefix === '') return null;
  const pattern = new RegExp(`^${escapeRegExp(branchPrefix)}([1-9]\\d*)-`);
  const match = pattern.exec(branch);
  return match === null ? null : Number(match[1]);
};

const labelHolder = (label, owners, targets) =>
  targets.find(
    ({ timeline }) => authorizeLabel(timeline, owners, label).authorized,
  ) ?? null;

// event: 'round' (the verifier finished a round) or 'labeled' (the label
// was added; the round on the current head must already be finished).
const decideTrigger = ({
  event,
  verdict,
  label,
  owners,
  pullTimeline,
  issueTimeline,
  eventLabel,
  roundHead,
  currentHead,
}) => {
  if (typeof label !== 'string' || label === '') {
    return skip('label name was not given');
  }
  if (event !== EVENT_ROUND && event !== EVENT_LABELED) {
    return skip('unknown trigger event');
  }
  if (!ANALYSED_VERDICTS.has(verdict)) {
    return skip('verdict is not FAIL or NEEDS_HUMAN');
  }
  if (event === EVENT_LABELED) {
    if (eventLabel !== label) return skip('event is for another label');
    if (!roundHead || roundHead !== currentHead) {
      return skip('verifier round has not finished on the current head');
    }
  }
  const holder = labelHolder(label, owners, [
    { name: 'pull request', timeline: pullTimeline },
    { name: 'issue', timeline: issueTimeline },
  ]);
  return holder === null
    ? skip('no label set by an owner on the issue or the pull request')
    : run(`${verdict} round, label set by an owner on the ${holder.name}`);
};

module.exports = {
  EVENT_ROUND,
  EVENT_LABELED,
  decideTrigger,
  extractIssueNumber,
};
