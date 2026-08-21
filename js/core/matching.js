/* matching.js — matches verified surplus food to eligible shelters/recipients.
 * Greedy allocation: nearest eligible shelter first, capped at each shelter's capacity,
 * until the surplus quantity is exhausted or shelters run out of room. */
const Matching = (() => {

  function eligibleShelters(surplus, shelters) {
    return shelters.filter(s => s.eligibility.includes('any') || s.eligibility.includes(surplus.foodType));
  }

  /**
   * @param {Object} surplus - { qtyKg, foodType, isSafe }
   * @param {Array} shelters
   * @returns {Object} { allocations: [{shelterId,name,qtyKg,distanceKm}], unallocatedKg, blocked }
   */
  function matchShelters(surplus, shelters) {
    if (surplus.isSafe === false) {
      return { allocations: [], unallocatedKg: surplus.qtyKg, blocked: true, reason: 'Item failed the safety check and cannot be redistributed.' };
    }

    const candidates = eligibleShelters(surplus, shelters)
      .slice()
      .sort((a, b) => a.distanceKm - b.distanceKm || b.capacityKg - a.capacityKg);

    let remaining = surplus.qtyKg;
    const allocations = [];
    for (const shelter of candidates) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, shelter.capacityKg);
      if (take <= 0) continue;
      allocations.push({ shelterId: shelter.id, name: shelter.name, qtyKg: Math.round(take * 10) / 10, distanceKm: shelter.distanceKm });
      remaining -= take;
    }

    return { allocations, unallocatedKg: Math.round(remaining * 10) / 10, blocked: false };
  }

  return { eligibleShelters, matchShelters };
})();
