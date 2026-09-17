// test_api_suite.mjs
async function test() {
  const base = "http://127.0.0.1:4000/api";
  
  // 1. Test login admin
  const res1 = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "admin", pin: "123456" })
  });
  const data1 = await res1.json();
  console.log("1. Login Admin:", data1.success, "Role:", data1.user?.role);

  // 2. Test login driver jeep
  const res2 = await fetch(base + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "budi", pin: "123456" })
  });
  const data2 = await res2.json();
  console.log("2. Login Driver Jeep:", data2.success, "Role:", data2.user?.role);

  // 3. Test RBAC: Driver Jeep
  const resTripsJeep = await fetch(base + "/trips?role=driver_jeep&userId=w-jeep-1");
  const tripsJeep = await resTripsJeep.json();
  console.log("3. Driver Jeep Checks:");
  console.log("   - Has own jeepFee:", typeof tripsJeep[0]?.jeepFee === 'number');
  console.log("   - fieldDriverFee hidden (undefined):", tripsJeep[0]?.fieldDriverFee === undefined);
  console.log("   - photographerFee hidden (undefined):", tripsJeep[0]?.photographerFee === undefined);
  console.log("   - operationalCost hidden (undefined):", tripsJeep[0]?.operationalCost === undefined);
  console.log("   - itinerary hidden (empty):", tripsJeep[0]?.itinerary?.length === 0);

  // 4. Test RBAC: Driver Lapangan (Shuttle)
  const resTripsField = await fetch(base + "/trips?role=driver_lapangan&userId=w-field-1");
  const tripsField = await resTripsField.json();
  console.log("4. Driver Lapangan Checks:");
  console.log("   - Has own fieldDriverFee:", typeof tripsField[0]?.fieldDriverFee === 'number');
  console.log("   - jeepFee hidden (undefined):", tripsField[0]?.jeepFee === undefined);
  console.log("   - photographerFee hidden (undefined):", tripsField[0]?.photographerFee === undefined);
  console.log("   - total operationalCost hidden (undefined):", tripsField[0]?.operationalCost === undefined);
  console.log("   - stop-level operationalCost hidden (undefined):", tripsField[0]?.itinerary?.[0]?.operationalCost === undefined);

  // 5. Test RBAC: Fotografer
  const resTripsPhoto = await fetch(base + "/trips?role=photographer&userId=w-photo-1");
  const tripsPhoto = await resTripsPhoto.json();
  console.log("5. Fotografer Checks:");
  console.log("   - Has own photographerFee:", typeof tripsPhoto[0]?.photographerFee === 'number');
  console.log("   - jeepFee hidden (undefined):", tripsPhoto[0]?.jeepFee === undefined);
  console.log("   - fieldDriverFee hidden (undefined):", tripsPhoto[0]?.fieldDriverFee === undefined);
  console.log("   - total operationalCost hidden (undefined):", tripsPhoto[0]?.operationalCost === undefined);
  console.log("   - stop-level operationalCost hidden (undefined):", tripsPhoto[0]?.itinerary?.[0]?.operationalCost === undefined);

  // 6. Test RBAC: Admin (Full Financial Access)
  const resTripsAdmin = await fetch(base + "/trips?role=admin");
  const tripsAdmin = await resTripsAdmin.json();
  console.log("6. Admin Checks:");
  console.log("   - Has jeepFee:", typeof tripsAdmin[0]?.jeepFee === 'number');
  console.log("   - Has fieldDriverFee:", typeof tripsAdmin[0]?.fieldDriverFee === 'number');
  console.log("   - Has photographerFee:", typeof tripsAdmin[0]?.photographerFee === 'number');
  console.log("   - Has total operationalCost:", typeof tripsAdmin[0]?.operationalCost === 'number');
  console.log("   - Has packagePrice:", typeof tripsAdmin[0]?.packagePrice === 'number');
  console.log("   - Has totalCost:", typeof tripsAdmin[0]?.totalCost === 'number');

  // 7. Test PnL & Payroll (Admin Only)
  const resPnl = await fetch(base + "/analytics/pnl");
  const pnl = await resPnl.json();
  console.log("7. PnL Total Revenue:", pnl.totalRevenue, "Net Profit:", pnl.netProfit);
}
test();
