export interface RevenueSplit {
  platformRevenuePaise: number;
  hostPayablePaise: number;
}

/** Cafe: flat ₹49, 100% platform revenue, nothing owed to a host. */
export function cafeRevenue(): RevenueSplit {
  return { platformRevenuePaise: 4900, hostPayablePaise: 0 };
}

/**
 * Delulu-hosted events: 100% platform revenue.
 * Partner events: split by the host's commissionBps (basis points Delulu keeps).
 */
export function eventRevenue(pricePaise: number, isDeluluHosted: boolean, commissionBps: number): RevenueSplit {
  if (isDeluluHosted) {
    return { platformRevenuePaise: pricePaise, hostPayablePaise: 0 };
  }
  const platformRevenuePaise = Math.round((pricePaise * commissionBps) / 10000);
  const hostPayablePaise = pricePaise - platformRevenuePaise;
  return { platformRevenuePaise, hostPayablePaise };
}
