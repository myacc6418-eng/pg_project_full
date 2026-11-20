import assert from 'node:assert/strict';
import http from 'node:http';
import { createApiApp } from '../src/app';
import { db } from '../src/shared/db';
import {
  BedStatus,
  DocumentVerificationStatus,
  ExpenseCategory,
  LocationVerificationStatus,
  PropertyApprovalStatus,
  SubscriptionTier,
  UserRole,
} from '../../../packages/shared/types';

async function runTests() {
  db.resetSeed();
  const app = createApiApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function req(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  try {
    // 1. Block public Super Admin registration
    const adminReg = await req('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: UserRole.SUPER_ADMIN,
        fullName: 'Fake Admin',
        email: 'fakeadmin@test.in',
        phone: '9111111111',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        acceptTerms: true,
      }),
    });
    assert.equal(adminReg.status, 400, 'Public Super Admin registration must be rejected');

    // 2. Public PG discovery hides pending Elite Residency PG
    const pubList = await req('/api/v1/properties/public');
    assert.equal(pubList.status, 200);
    assert.equal(
      pubList.data.properties.some((p: any) => p.id === 'pg_elite_residency'),
      false,
      'Unapproved/unverified PG must not appear in public discovery'
    );

    // 3. Login as Vikram (PG Owner) and Kavya (other PG Owner) and verify isolation
    const ownerLogin = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'vikram.reddy@demo.pgfinder.in', password: 'Password@123' }),
    });
    assert.equal(ownerLogin.status, 200);
    const ownerToken = ownerLogin.data.accessToken;

    const kavyaLogin = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'kavya.nair@demo.pgfinder.in', password: 'Password@123' }),
    });
    assert.equal(kavyaLogin.status, 200);
    const kavyaToken = kavyaLogin.data.accessToken;

    const forbiddenAdmin = await req('/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(forbiddenAdmin.status, 403, 'Owner must not access Super Admin endpoints');

    // 4. Super Admin approves & verifies Elite Residency -> owner buys ₹199 lifetime -> visible publicly
    const adminLogin = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@pgfinder.in', password: 'Password@123' }),
    });
    const adminToken = adminLogin.data.accessToken;

    const appRes = await req('/api/v1/properties/admin/pg_elite_residency/approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: PropertyApprovalStatus.APPROVED, reason: 'Verified in test' }),
    });
    assert.equal(appRes.status, 200);

    const locRes = await req('/api/v1/properties/admin/pg_elite_residency/location-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: LocationVerificationStatus.VERIFIED, notes: 'GPS verified' }),
    });
    assert.equal(locRes.status, 200);

    const lifeRes = await req('/api/v1/monetization/owner/lifetime-listing/pg_elite_residency', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(lifeRes.status, 200);

    const pubAfter = await req('/api/v1/properties/public');
    assert.equal(
      pubAfter.data.properties.some((p: any) => p.id === 'pg_elite_residency'),
      true,
      'Approved + Verified + Entitled PG must appear publicly'
    );

    // 5. Verified PG location edit triggers REVERIFICATION_REQUIRED & hides from public search
    const locEditRes = await req('/api/v1/properties/owner/pg_elite_residency', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ address: 'Plot 88 Moved Street, Kondapur' }),
    });
    assert.equal(locEditRes.status, 200);
    assert.equal(
      locEditRes.data.property.locationStatus,
      LocationVerificationStatus.REVERIFICATION_REQUIRED,
      'Editing verified property address must trigger REVERIFICATION_REQUIRED'
    );
    const pubAfterLocEdit = await req('/api/v1/properties/public');
    assert.equal(
      pubAfterLocEdit.data.properties.some((p: any) => p.id === 'pg_elite_residency'),
      false,
      'Property needing location re-verification must be hidden from public search'
    );

    // 6. Enforce single active stay per tenant (Ananya already has active stay)
    const ananyaLogin = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'ananya.sharma@demo.pgfinder.in', password: 'Password@123' }),
    });
    const ananyaToken = ananyaLogin.data.accessToken;

    const secondJoin = await req('/api/v1/operations/joining-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({
        propertyId: 'pg_urban_stay',
        preferredRoomType: 'TWIN',
        moveInDate: '2026-12-05',
      }),
    });
    assert.equal(secondJoin.status, 409, 'Tenant with active stay cannot join another PG');

    // 7. Floor, Room & Bed invariants + live vacancies
    const delNonEmptyFloor = await req('/api/v1/operations/owner/floors/flr_gn_2', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(delNonEmptyFloor.status, 409, 'Cannot delete floor that still has rooms');

    const delOccupiedBed = await req('/api/v1/operations/owner/beds/bed_gn_201a', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(delOccupiedBed.status, 409, 'Cannot delete occupied bed');

    const newRoomRes = await req('/api/v1/operations/owner/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        roomNumber: '209',
        floorNumber: 2,
        roomType: 'TWIN',
        monthlyRentInr: 9500,
        depositInr: 15000,
        bedCount: 2,
      }),
    });
    assert.equal(newRoomRes.status, 201);
    const createdBedId = newRoomRes.data.beds[0].id;

    const vacRes = await req('/api/v1/operations/owner/vacancies', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(
      vacRes.data.vacancies.some((v: any) => v.bedId === createdBedId),
      true,
      'Newly created bed must immediately appear in live vacancies'
    );

    // 8. Owner-assisted onboarding + duplicate stay check + bed transfer
    const onboardRes = await req('/api/v1/operations/owner/tenants/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        bedId: createdBedId,
        fullName: 'Kiran Test Resident',
        phone: '9000012345',
        monthlyRentInr: 9500,
        securityDepositInr: 10000,
        depositPaid: true,
      }),
    });
    assert.equal(onboardRes.status, 201);
    const newStayId = onboardRes.data.stay.id;

    const secondBedId = newRoomRes.data.beds[1].id;
    const dupOnboardRes = await req('/api/v1/operations/owner/tenants/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        bedId: secondBedId,
        fullName: 'Kiran Test Resident',
        phone: '9000012345',
      }),
    });
    assert.equal(dupOnboardRes.status, 409, 'Cannot onboard tenant who already has an active stay');

    const transferRes = await req(`/api/v1/operations/owner/stays/${newStayId}/transfer-bed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        targetBedId: secondBedId,
        reason: 'Moved to window bed',
        updateRentToNewRoom: true,
      }),
    });
    assert.equal(transferRes.status, 200);
    assert.equal(transferRes.data.stay.bedId, secondBedId);

    // 9. Private Tenant Document RBAC & Non-Aadhaar Enforcement
    const aadhaarUpload = await req('/api/v1/operations/tenant/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({
        docType: 'OTHER',
        title: 'My Aadhaar Card Copy',
        fileUrl: 'https://storage.pgfinder.in/private/a.pdf',
      }),
    });
    assert.equal(aadhaarUpload.status, 400, 'Aadhaar document uploads must be strictly blocked');

    const ownerDocView = await req('/api/v1/operations/owner/documents/tdoc_ananya_1', {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(ownerDocView.status, 200, 'Owning PG owner can access tenant document');

    const otherOwnerDocView = await req('/api/v1/operations/owner/documents/tdoc_ananya_1', {
      headers: { Authorization: `Bearer ${kavyaToken}` },
    });
    assert.equal(otherOwnerDocView.status, 403, 'Non-owning PG owner must be denied access to private tenant KYC doc');

    const docReviewRes = await req('/api/v1/operations/owner/documents/tdoc_ananya_1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        status: DocumentVerificationStatus.VERIFIED,
        notes: 'Employer ID verified against onboarding record',
      }),
    });
    assert.equal(docReviewRes.status, 200);

    // 10. Monthly Rent Generation + Partial Payment + Expense Edit/Delete
    const genRentRes = await req('/api/v1/operations/owner/rent/generate-month', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ billingMonth: '2027-01', propertyId: 'pg_green_nest' }),
    });
    assert.equal(genRentRes.status, 200);
    assert.ok(genRentRes.data.createdCount >= 1);

    const expCreate = await req('/api/v1/operations/owner/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        category: ExpenseCategory.SUPPLIES,
        amountInr: 1500,
        date: '2026-11-19',
        notes: 'Cleaning supplies',
      }),
    });
    assert.equal(expCreate.status, 201);
    const expId = expCreate.data.expense.id;

    const expEdit = await req(`/api/v1/operations/owner/expenses/${expId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ amountInr: 1750 }),
    });
    assert.equal(expEdit.status, 200);
    assert.equal(expEdit.data.expense.amountInr, 1750);

    const expDel = await req(`/api/v1/operations/owner/expenses/${expId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.equal(expDel.status, 200);

    // 11. Checkout finalization releases bed and preserves unpaid balance as OutstandingDue
    const checkoutRes = await req(`/api/v1/operations/owner/stays/${newStayId}/finalize-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ deductionInr: 15000, deductionReason: 'Early exit + unpaid rent offset' }),
    });
    assert.equal(checkoutRes.status, 200);
    assert.equal(checkoutRes.data.bedReleased, true);
    assert.ok(checkoutRes.data.remainingUnpaidDebt > 0, 'Unpaid balance exceeding deposit must carry forward');
    assert.equal(checkoutRes.data.createdDue.isFormerTenant, true);

    const bedCheck = db.getState().beds.find((b) => b.id === secondBedId);
    assert.equal(bedCheck?.status, BedStatus.AVAILABLE, 'Finalized checkout must release bed to AVAILABLE');

    // 12. Staff & Payroll Business Plan Gate
    const staffDenied = await req('/api/v1/operations/owner/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        fullName: 'Ramesh Caretaker',
        phone: '9888877777',
        roleTitle: 'CARETAKER',
        monthlySalaryInr: 15000,
      }),
    });
    assert.equal(staffDenied.status, 403, 'Staff endpoints must require Business plan');

    const upgradeBiz = await req('/api/v1/monetization/owner/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ tier: SubscriptionTier.BUSINESS }),
    });
    assert.equal(upgradeBiz.status, 200);

    const staffCreated = await req('/api/v1/operations/owner/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        fullName: 'Ramesh Caretaker',
        phone: '9888877777',
        roleTitle: 'CARETAKER',
        monthlySalaryInr: 15000,
      }),
    });
    assert.equal(staffCreated.status, 201);

    const payrollRes = await req('/api/v1/operations/owner/staff/payroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        staffId: staffCreated.data.staffMember.id,
        month: '2026-11',
        bonusInr: 1000,
        deductionInr: 0,
      }),
    });
    assert.equal(payrollRes.status, 201);
    assert.equal(payrollRes.data.payrollRecord.netPaidInr, 16000);

    // 13. Owner Profile, Verified Contact Change, Password Change, Active Sessions & Non-Destructive Deletion Request
    const profilePatch = await req('/api/v1/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        fullName: 'Vikram Reddy Updated',
        businessName: 'Green Nest Hospitality LLP',
        businessDescription: 'Tech corridor verified PGs',
        city: 'Hyderabad',
        language: 'en-IN',
      }),
    });
    assert.equal(profilePatch.status, 200);
    assert.equal(profilePatch.data.user.fullName, 'Vikram Reddy Updated');

    const contactReq = await req('/api/v1/auth/profile/contact-change/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ field: 'phone', value: '9876501234' }),
    });
    assert.equal(contactReq.status, 200);
    assert.ok(contactReq.data.devOtpHint);

    const contactVer = await req('/api/v1/auth/profile/contact-change/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ field: 'phone', value: '9876501234', code: contactReq.data.devOtpHint }),
    });
    assert.equal(contactVer.status, 200);
    assert.equal(contactVer.data.user.phone, '9876501234');

    const pwdChange = await req('/api/v1/auth/password/change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        currentPassword: 'Password@123',
        newPassword: 'Password@456',
        confirmPassword: 'Password@456',
      }),
    });
    assert.equal(pwdChange.status, 200);

    const relogin = await req('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'vikram.reddy@demo.pgfinder.in', password: 'Password@456' }),
    });
    assert.equal(relogin.status, 200);
    const refreshedOwnerToken = relogin.data.accessToken;

    const sessionsRes = await req('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${refreshedOwnerToken}` },
    });
    assert.equal(sessionsRes.status, 200);
    assert.ok(Array.isArray(sessionsRes.data.sessions) && sessionsRes.data.sessions.length >= 1);

    const revokeRes = await req('/api/v1/auth/sessions/revoke-others', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshedOwnerToken}` },
    });
    assert.equal(revokeRes.status, 200);

    const propCountBeforeDel = db.getState().properties.filter((p) => p.ownerId === ownerLogin.data.user.id).length;
    const delReq = await req('/api/v1/auth/account/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshedOwnerToken}` },
      body: JSON.stringify({ password: 'Password@456', reason: 'Testing non-destructive deletion workflow' }),
    });
    assert.equal(delReq.status, 200);
    assert.ok(delReq.data.user.deletionRequestedAt);
    assert.equal(
      db.getState().properties.filter((p) => p.ownerId === ownerLogin.data.user.id).length,
      propCountBeforeDel,
      'Account deletion request must preserve owner properties and ledgers'
    );

    // 14. QR Onboarding Eligibility Lookup & Full E2E Lifecycle (Submit -> Request Info -> Respond -> Approve -> Accept Terms v2.0 -> Bed Occupied)
    const qrEligible = await req('/api/v1/properties/qr/pg_green_nest');
    assert.equal(qrEligible.status, 200);
    assert.equal(qrEligible.data.eligible, true);
    assert.ok(qrEligible.data.roomTypesSummary.length >= 1);
    const initialGnVacancies = qrEligible.data.property.availableBeds;

    const qrIneligible = await req('/api/v1/properties/qr/pg_elite_residency');
    assert.equal(qrIneligible.status, 200);
    assert.equal(qrIneligible.data.eligible, false, 'PG requiring location re-verification must not be eligible for QR onboarding');

    // Register a fresh Tenant account for QR onboarding test
    const newTenantReg = await req('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: UserRole.TENANT,
        fullName: 'Rohan QR Resident',
        email: 'rohan.qr@test.pgfinder.in',
        phone: '9880011223',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        acceptTerms: true,
      }),
    });
    assert.equal(newTenantReg.status, 201);
    const rohanToken = newTenantReg.data.accessToken;

    const qrJoinSubmit = await req('/api/v1/operations/joining-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rohanToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        preferredRoomType: 'TWIN',
        moveInDate: '2026-12-10',
        notes: 'Arriving evening around 6 PM',
        origin: 'QR',
        consentAccepted: true,
      }),
    });
    assert.equal(qrJoinSubmit.status, 201);
    assert.equal(qrJoinSubmit.data.joiningRequest.origin, 'QR');
    const qrRequestId = qrJoinSubmit.data.joiningRequest.id;

    // Owner requests additional info
    const reqInfoRes = await req(`/api/v1/operations/owner/joining-requests/${qrRequestId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshedOwnerToken}` },
      body: JSON.stringify({ decision: 'REQUEST_INFO', notes: 'Please share your workplace name.' }),
    });
    assert.equal(reqInfoRes.status, 200);
    assert.equal(reqInfoRes.data.joiningRequest.status, 'INFO_REQUESTED');

    // Tenant responds to clarification
    const tenantRespRes = await req(`/api/v1/operations/joining-requests/${qrRequestId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rohanToken}` },
      body: JSON.stringify({ notes: 'Working at TechPark Hyderabad.' }),
    });
    assert.equal(tenantRespRes.status, 200);
    assert.equal(tenantRespRes.data.joiningRequest.status, 'PENDING');

    // Owner approves & assigns available bed from Green Nest
    const openGnBed = db
      .getState()
      .beds.find((b) => b.propertyId === 'pg_green_nest' && b.status === BedStatus.AVAILABLE);
    assert.ok(openGnBed, 'Green Nest must have at least one available bed');

    const qrApproveRes = await req(`/api/v1/operations/owner/joining-requests/${qrRequestId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshedOwnerToken}` },
      body: JSON.stringify({ decision: 'APPROVE', bedId: openGnBed!.id }),
    });
    assert.equal(qrApproveRes.status, 200);
    assert.equal(qrApproveRes.data.joiningRequest.status, 'APPROVED_AWAITING_TERMS');

    // Tenant accepts Agreement v2.0 & activates stay
    const qrAcceptRes = await req(`/api/v1/operations/joining-requests/${qrRequestId}/accept-terms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rohanToken}` },
      body: JSON.stringify({ acceptedTerms: true, agreementVersion: 'v2.0' }),
    });
    assert.equal(qrAcceptRes.status, 200);
    assert.equal(qrAcceptRes.data.stay.acceptedAgreementVersion, 'v2.0');
    assert.equal(qrAcceptRes.data.joiningRequest.acceptedAgreementVersion, 'v2.0');
    assert.ok(qrAcceptRes.data.joiningRequest.acceptedAt);

    // Verify bed became OCCUPIED and QR lookup vacancy decremented
    const assignedBedAfter = db.getState().beds.find((b) => b.id === openGnBed!.id);
    assert.equal(assignedBedAfter?.status, BedStatus.OCCUPIED);
    const qrAfterActivate = await req('/api/v1/properties/qr/pg_green_nest');
    assert.equal(qrAfterActivate.data.property.availableBeds, initialGnVacancies - 1);

    // 15. Tenant Upgrade Flows (Review, Cancel Request, Notice Read, Complaint Comment/Confirm Resolved, Maintenance, Laundry, Roommate Settle & Task, Doc Replace, Expected Checkout, Support Ticket)
    // 15a. New tenant submits and cancels joining request
    const cancelTenantReg = await req('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: UserRole.TENANT,
        fullName: 'Meera Cancel Test',
        email: 'meera.cancel@test.pgfinder.in',
        phone: '9880011999',
        password: 'Password@123',
        confirmPassword: 'Password@123',
        acceptTerms: true,
      }),
    });
    assert.equal(cancelTenantReg.status, 201);
    const meeraToken = cancelTenantReg.data.accessToken;

    const meeraJoin = await req('/api/v1/operations/joining-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${meeraToken}` },
      body: JSON.stringify({
        propertyId: 'pg_green_nest',
        preferredRoomType: 'TWIN',
        moveInDate: '2026-12-20',
      }),
    });
    assert.equal(meeraJoin.status, 201);
    const meeraCancel = await req(`/api/v1/operations/joining-requests/${meeraJoin.data.joiningRequest.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${meeraToken}` },
      body: JSON.stringify({ reason: 'Changed travel dates' }),
    });
    assert.equal(meeraCancel.status, 200);
    assert.equal(meeraCancel.data.joiningRequest.status, 'CANCELLED');

    // 15b. Ananya submits verified resident review, marks notice read, comments/confirms complaint, books maintenance & laundry, settles roommate split & task, replaces doc, creates support ticket, requests expected checkout
    const ananyaWsBefore = await req('/api/v1/operations/tenant/workspace', {
      headers: { Authorization: `Bearer ${ananyaToken}` },
    });
    assert.equal(ananyaWsBefore.status, 200);
    assert.ok(ananyaWsBefore.data.activeStay);

    const revRes = await req('/api/v1/properties/public/pg_green_nest/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ rating: 5, comment: 'Clean dining hall and responsive caretaker.' }),
    });
    assert.equal(revRes.status, 201);

    if (ananyaWsBefore.data.notices.length > 0) {
      const noticeRead = await req(`/api/v1/operations/tenant/notices/${ananyaWsBefore.data.notices[0].id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ananyaToken}` },
      });
      assert.equal(noticeRead.status, 200);
      assert.ok(noticeRead.data.readNoticeIds.includes(ananyaWsBefore.data.notices[0].id));
    }

    const cmpCreate = await req('/api/v1/operations/tenant/complaints', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ category: 'INTERNET', priority: 'MEDIUM', description: 'Router rebooting intermittently on 2nd floor' }),
    });
    assert.equal(cmpCreate.status, 201);
    const cmpId = cmpCreate.data.complaint.id;

    const cmpComment = await req(`/api/v1/operations/tenant/complaints/${cmpId}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ note: 'Tested again this morning, speed improved.' }),
    });
    assert.equal(cmpComment.status, 200);
    assert.ok(cmpComment.data.complaint.timeline.length >= 1);

    const cmpConfirm = await req(`/api/v1/operations/tenant/complaints/${cmpId}/confirm-resolved`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ananyaToken}` },
    });
    assert.equal(cmpConfirm.status, 200);
    assert.equal(cmpConfirm.data.complaint.status, 'CLOSED');
    assert.equal(cmpConfirm.data.complaint.tenantConfirmedResolved, true);

    const maintReq = await req('/api/v1/operations/tenant/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ title: 'Study desk lamp flickering', priority: 'LOW' }),
    });
    assert.equal(maintReq.status, 201);

    const laundryReq = await req('/api/v1/operations/tenant/laundry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ itemsSummary: '4 kg daily wear wash & fold', pickupDate: '2026-12-12' }),
    });
    assert.equal(laundryReq.status, 201);

    const rmExp = await req('/api/v1/operations/tenant/roommate-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ title: 'Drinking Water Cans', amountInr: 200, splitCount: 2 }),
    });
    assert.equal(rmExp.status, 201);
    const rmSettle = await req(`/api/v1/operations/tenant/roommate-expenses/${rmExp.data.roommateExpense.id}/settle`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ananyaToken}` },
    });
    assert.equal(rmSettle.status, 200);
    assert.equal(rmSettle.data.roommateExpense.isSettled, true);

    const rmTask = await req('/api/v1/operations/tenant/roommate-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ type: 'GROCERY', title: 'Dish soap & sponges' }),
    });
    assert.equal(rmTask.status, 201);
    const rmTaskDone = await req(`/api/v1/operations/tenant/roommate-tasks/${rmTask.data.task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ completed: true }),
    });
    assert.equal(rmTaskDone.status, 200);
    assert.equal(rmTaskDone.data.task.completed, true);

    const docReplace = await req('/api/v1/operations/tenant/documents/tdoc_ananya_1/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ title: 'Updated Employer Badge 2027', fileUrl: 'https://storage.pgfinder.in/private/badge-2027.pdf' }),
    });
    assert.equal(docReplace.status, 200);
    assert.equal(docReplace.data.document.status, DocumentVerificationStatus.PENDING);

    const ticketCreate = await req('/api/v1/operations/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ subject: 'Deposit statement inquiry', category: 'PAYMENT', priority: 'MEDIUM', message: 'Need clarification on deposit receipt formatting.' }),
    });
    assert.equal(ticketCreate.status, 201);
    const ticketId = ticketCreate.data.ticket.id;

    const checkoutWithDate = await req('/api/v1/operations/tenant/checkout/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ananyaToken}` },
      body: JSON.stringify({ expectedCheckoutDate: '2026-12-31' }),
    });
    assert.equal(checkoutWithDate.status, 200);
    assert.equal(checkoutWithDate.data.stay.expectedCheckoutDate, '2026-12-31');

    // 16. Super Admin Upgrade Flows (Overview/Ops, Owner/Tenant Detail + Audited Doc Inspect, Ticket Resolve, Local Ad Create/Pause, AdMob Save + Locked Checkout, Event Edit/Waitlist Promote, CMS Update, Broadcast Notification)
    const adminOverview = await req('/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminOverview.status, 200);
    assert.ok(typeof adminOverview.data.metrics.platformTotalRevenueInr === 'number');
    assert.ok(typeof adminOverview.data.metrics.ownerRentCollectedInr === 'number');

    const adminOps = await req('/api/v1/admin/operations', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminOps.status, 200);
    assert.ok(Array.isArray(adminOps.data.vacanciesByProperty));

    const ananyaId = ananyaLogin.data.user.id;
    const tenantDetailRes = await req(`/api/v1/admin/tenants/${ananyaId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(tenantDetailRes.status, 200);

    const docInspectRes = await req('/api/v1/admin/documents/tdoc_ananya_1/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ reason: 'Compliance audit test' }),
    });
    assert.equal(docInspectRes.status, 200);
    assert.ok(docInspectRes.data.auditedAt);
    assert.equal(
      db.getState().auditLogs[0].action,
      'SENSITIVE_DOCUMENT_ACCESSED',
      'Super Admin document inspection must write SENSITIVE_DOCUMENT_ACCESSED audit entry'
    );

    const ticketResolve = await req(`/api/v1/admin/support-tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        status: 'RESOLVED',
        assignedTo: 'Platform Support Lead',
        resolutionNotes: 'Provided PDF receipt copy to resident.',
        reply: 'Your receipt breakdown is attached in your Rent Ledger.',
      }),
    });
    assert.equal(ticketResolve.status, 200);
    assert.equal(ticketResolve.data.ticket.status, 'RESOLVED');

    const adCreate = await req('/api/v1/monetization/admin/local-businesses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'FreshBowl Kitchen',
        category: 'Affordable Food',
        title: 'Weekly Tiffin Plan',
        description: 'Home-style North & South Indian meals delivered to PG gates.',
        city: 'Hyderabad',
        locality: 'Madhapur',
        offerText: '10% Off Monthly Meal Pass',
        isSponsored: true,
      }),
    });
    assert.equal(adCreate.status, 201);
    const adId = adCreate.data.business.id;

    const adPause = await req(`/api/v1/monetization/admin/local-businesses/${adId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'PAUSED' }),
    });
    assert.equal(adPause.status, 200);
    assert.equal(adPause.data.business.status, 'PAUSED');

    const admobSave = await req('/api/v1/monetization/admin/admob/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        enabled: true,
        environment: 'test',
        dailyInterstitialCap: 2,
        adFreeCheckoutAndPayments: false,
      }),
    });
    assert.equal(admobSave.status, 200);
    assert.equal(
      admobSave.data.settings.adFreeCheckoutAndPayments,
      true,
      'Backend must strictly lock adFreeCheckoutAndPayments to true'
    );

    const cmsSave = await req('/api/v1/admin/cms', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        announcementBanner: {
          enabled: true,
          title: 'Zero Brokerage Verified PGs',
          message: 'Every PG pin is inspected before going live.',
          audience: 'ALL',
        },
      }),
    });
    assert.equal(cmsSave.status, 200);
    assert.equal(cmsSave.data.cms.announcementBanner.enabled, true);

    const broadcastRes = await req('/api/v1/admin/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        title: 'Holiday Fire Safety Check',
        body: 'All PG properties must ensure emergency exit signage is clearly lit.',
        targetAudience: 'PG_OWNERS',
        category: 'COMPLIANCE',
      }),
    });
    assert.equal(broadcastRes.status, 201);
    assert.ok(broadcastRes.data.broadcast.sentCount >= 1);

    console.log('ALL BACKEND WORKFLOW TESTS PASSED (16 SUITES)');
  } finally {
    db.resetSeed();
    server.close();
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
