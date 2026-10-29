import { useEffect, useState } from "react";
import { loungeApi } from "../api/loungeApi";

// mmrChanges only carry partner IDs. A table the two players shared lists every
// player's name, so one table per partner resolves it. Shared per page load.
const nameRequests = new Map();

/** Forgets resolved names (for tests). */
export function clearPartnerNameCache() {
  nameRequests.clear();
}

function resolveName(playerId, tableId) {
  if (!nameRequests.has(playerId)) {
    const request = Promise.resolve()
      .then(() => loungeApi.getTableById(tableId))
      .then((table) => {
        for (const team of table?.teams || []) {
          for (const score of team.scores || []) {
            if (score.playerId === playerId) return score.playerName ?? null;
          }
        }
        return null;
      })
      .catch(() => null)
      .then((name) => {
        if (!name) nameRequests.delete(playerId);
        return name;
      });
    nameRequests.set(playerId, request);
  }
  return nameRequests.get(playerId);
}

/**
 * Names for partner IDs, looked up from a table each partner shared with the player.
 * @param {Array<{ playerId: number, lastTableId: number }>} partners
 * @returns {Object} playerId -> name, filled in as lookups finish
 */
export function usePartnerNames(partners) {
  const [names, setNames] = useState({});
  const lookupKey = partners
    .map((partner) => `${partner.playerId}:${partner.lastTableId}`)
    .join(",");

  useEffect(() => {
    let active = true;
    partners.forEach(({ playerId, lastTableId }) => {
      if (lastTableId == null) return;
      resolveName(playerId, lastTableId).then((name) => {
        if (active && name) {
          setNames((current) =>
            current[playerId] === name ? current : { ...current, [playerId]: name },
          );
        }
      });
    });
    return () => {
      active = false;
    };
    // lookupKey captures every partner/table pair
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey]);

  return names;
}

export default usePartnerNames;
