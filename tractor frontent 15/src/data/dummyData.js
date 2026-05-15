export const dummyFarmers = [
  { id: 'f1', name: 'Ramesh Singh', email: 'farmer@dummy.com', location: 'Punjab', language: 'en', earnings: 1500 },
  { id: 'f2', name: 'Suresh Kumar', email: 'suresh@dummy.com', location: 'Haryana', language: 'hi', earnings: 0 },
];

export const dummyTractors = [
  { id: 't1', model: 'Mahindra 575 DI', status: 'available', location: [30.9, 75.8], operator: 'OPERATOR-01', email: 'op01@tractorlink.com' },
  { id: 't2', model: 'Sonalika DI 745', status: 'busy', location: [30.91, 75.85], operator: 'OPERATOR-02', email: 'op02@tractorlink.com' },
  { id: 't3', model: 'John Deere 5310', status: 'maintenance', location: [30.88, 75.82], operator: 'OPERATOR-03', email: 'op03@tractorlink.com' },
];

export const dummyBookings = [
  { 
    id: 'b1', 
    farmerId: 'f1', 
    serviceType: 'Plough', 
    landSize: 5, 
    totalPrice: 4500, 
    status: 'Scheduled', 
    date: '2026-03-21T10:00:00Z',
    tractorId: 't1',
    paymentStatus: 'Pending',
  },
  { 
    id: 'b2', 
    farmerId: 'f2', 
    serviceType: 'Harrow', 
    landSize: 2.5, 
    totalPrice: 2250, 
    status: 'Completed', 
    date: '2026-03-15T14:30:00Z',
    tractorId: 't2',
    paymentStatus: 'Paid',
  },
  { 
    id: 'b3', 
    farmerId: 'f1', 
    serviceType: 'Rotavator', 
    landSize: 3, 
    totalPrice: 3200, 
    status: 'In Progress', 
    date: '2026-03-20T08:00:00Z',
    tractorId: 't2',
    paymentStatus: 'Advance Paid',
  },
  { 
    id: 'b4', 
    farmerId: 'f2', 
    serviceType: 'Full', 
    landSize: 10, 
    totalPrice: 22000, 
    status: 'Scheduled', 
    date: '2026-03-22T08:00:00Z',
    tractorId: null,
    paymentStatus: 'Pending',
  },
  { 
    id: 'b5', 
    farmerId: 'f1', 
    serviceType: 'Ridge', 
    landSize: 4, 
    totalPrice: 2800, 
    status: 'Scheduled', 
    date: '2026-03-23T10:00:00Z',
    tractorId: null,
    paymentStatus: 'Pending',
  }
];

export const serviceRates = {
  Plough: 900,
  Harrow: 800,
  Ridge: 700,
  Full: 2200,
};

export const dummySettings = {
  dieselPrice: 94.5,
  distanceChargePerKm: 25
};
