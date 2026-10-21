'use strict';

function preserveSolvedCount(previous, incoming) {
  if (incoming.solvedCountComplete === true) return incoming;

  const hasPreviousCount = previous &&
    previous.solved !== null &&
    previous.solved !== undefined &&
    previous.solved !== '' &&
    Number.isFinite(Number(previous.solved)) &&
    Number(previous.solved) >= 0 &&
    previous.solvedCountComplete !== false;

  if (!hasPreviousCount) {
    return { ...incoming, solvedCountComplete: false };
  }

  return {
    ...incoming,
    solved: Number(previous.solved),
    solvedCountComplete: true
  };
}

module.exports = { preserveSolvedCount };
