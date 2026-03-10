/**
 * Seed Data Generator for CloseOut
 * Generates realistic engineering action items for demo / testing purposes.
 */

import { bulkCreateItems } from '../db/database.js';
import {
  calculateRiskLevel,
  calculatePriority,
  LIKELIHOOD_OPTIONS,
  CONSEQUENCE_OPTIONS,
  EFFORT_OPTIONS,
  ITEM_TYPES,
  STATUS_OPTIONS,
} from './riskMatrix.js';

// ---------------------------------------------------------------------------
// Reference Data
// ---------------------------------------------------------------------------

const NAMES = [
  'Ruan du Plessis',
  'Sarah Chen',
  'Mike Okonkwo',
  'Priya Nair',
  'Jacques Beaumont',
  'Fatima Al-Rashid',
  'Tom van der Berg',
  'Lisa Johansen',
];

const DEPARTMENTS = [
  'Mechanical',
  'Electrical',
  'Instrumentation',
  'Civil',
  'QHSE',
  'Project Controls',
];

const LOCATIONS = [
  'Fabrication Yard',
  'Module A',
  'Module B',
  'Pipe Rack',
  'Control Room',
  'Turret Area',
  'FPSO Hull',
];

const SOURCES = [
  'Weekly Progress Meeting',
  'Site Walkdown',
  'HAZOP Review',
  'QA Inspection',
  'Management Review',
  'Incident Investigation',
  'Commissioning Check',
  'Design Review',
  'SOR Audit',
  'PTW Audit',
  'Pre-commissioning Review',
  'Client Interface Meeting',
];

// ---------------------------------------------------------------------------
// Title Templates (30+ unique engineering titles)
// ---------------------------------------------------------------------------

const ACTION_TITLES = [
  'Install pressure relief valve on Line {num}-{letter}',
  'Complete cable tray Section {letter} inspection',
  'Replace corroded pipe section at {loc} junction',
  'Verify torque values on flange assembly {num}{letter}',
  'Install earthing connections for MCC-{num}',
  'Complete hydrostatic test on piping loop {num}',
  'Remediate coating defects on structural steel Level {num}',
  'Install fire detection system in Zone {num}{letter}',
  'Update P&ID drawings for system {num}',
  'Complete electrical continuity test on Panel {letter}{num}',
  'Install safety shower at emergency station {num}',
  'Replace gaskets on heat exchanger HE-{num}',
  'Verify alignment of pump P-{num}{letter}',
  'Install insulation on steam line SL-{num}',
  'Complete functional test of ESD valve {num}{letter}',
  'Remediate weld defect on joint WJ-{num}',
  'Install vibration monitoring on compressor C-{num}',
  'Complete CCTV installation in Area {letter}{num}',
  'Replace damaged cable glands on JB-{num}',
  'Verify calibration of pressure transmitter PT-{num}',
  'Install handrails on platform Level {num} access',
  'Complete leak test on instrument air system IA-{num}',
  'Replace faulty solenoid valve SV-{num}{letter}',
  'Install temporary lighting in construction zone {num}',
  'Complete radiographic testing on weld {num}-{letter}',
  'Verify fire damper operation in HVAC duct {num}',
  'Install corrosion coupons in process line PL-{num}',
  'Complete DCS configuration for loop {num}{letter}',
  'Replace worn bearing on agitator AG-{num}',
  'Install cathodic protection test points TP-{num}',
  'Complete as-built survey for structural bay {letter}{num}',
  'Verify emergency lighting battery backup EL-{num}',
  'Install pipe supports PS-{num} through PS-{num2}',
  'Complete noise survey at compressor station CS-{num}',
  'Replace corroded deck plate at grid {letter}-{num}',
  'Verify instrument loop diagram for FT-{num}',
  'Install anti-slip coating on walkway W-{num}',
  'Complete punch list walkdown for Subsystem {num}{letter}',
  'Replace defective check valve CV-{num}',
  'Install thermowell TW-{num} on reactor vessel',
  'Complete painting touch-up on Module {letter} exterior',
  'Verify crane certification for pedestal crane PC-{num}',
  'Install gas detection sensor GD-{num} in enclosed space',
  'Complete bonding and grounding verification for tank T-{num}',
  'Replace worn packing on valve V-{num}{letter}',
];

const PUNCH_TITLES = [
  'Missing nameplate on valve V-{num}{letter}',
  'Paint damage on pipe support PS-{num}',
  'Incorrect bolt grade on flange F-{num}',
  'Cable label missing on tray CT-{num}',
  'Drainage slope incorrect at area {letter}{num}',
  'Gasket protrusion on joint JT-{num}',
  'Weld spatter on stainless pipe SS-{num}',
  'Missing insulation tag on IL-{num}',
  'Incorrect valve handle orientation V-{num}',
  'Scaffold tie-in damage to coating at Level {num}',
  'Missing earthing lug on equipment skid SK-{num}',
  'Incorrect colour coding on pipeline PL-{num}',
  'Sealant missing around cable transit CT-{num}',
  'Grating clip missing at platform PF-{num}',
  'Instrument tubing not clipped at JB-{num}',
];

const AUDIT_TITLES = [
  'Non-conformance: welding procedure WPS-{num} not followed',
  'Finding: PPE compliance gap in construction zone {num}',
  'Observation: housekeeping below standard at {loc}',
  'Non-conformance: lifting plan LP-{num} incomplete',
  'Finding: confined space entry permit deficiency CS-{num}',
  'Observation: tool inspection records missing for {loc}',
  'Non-conformance: material traceability gap MTR-{num}',
  'Finding: scaffold inspection tags expired at zone {num}',
  'Observation: chemical storage arrangement at {loc}',
  'Non-conformance: NDE procedure deviation report NDT-{num}',
  'Finding: emergency evacuation drill records incomplete',
  'Observation: waste segregation issue at {loc}',
  'Non-conformance: welding consumable storage WC-{num}',
  'Finding: permit to work process deviation at Area {num}',
  'Observation: safety signage missing at access point AP-{num}',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedChoice(options, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < options.length; i++) {
    random -= weights[i];
    if (random <= 0) return options[i];
  }
  return options[options.length - 1];
}

function dateOffset(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}

function isoTimestampOffset(daysFromToday, hoursOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(d.getHours() + hoursOffset);
  return d.toISOString();
}

function fillTemplate(template) {
  return template
    .replace(/\{num\}/g, () => String(randomInt(1, 99)))
    .replace(/\{num2\}/g, () => String(randomInt(100, 150)))
    .replace(/\{letter\}/g, () => String.fromCharCode(65 + randomInt(0, 7)))
    .replace(/\{loc\}/g, () => randomItem(LOCATIONS));
}

// ---------------------------------------------------------------------------
// Corrective Action Templates
// ---------------------------------------------------------------------------

const CORRECTIVE_ACTIONS = [
  'Replace defective component and re-inspect per QA procedure.',
  'Rework affected area to meet specification requirements.',
  'Issue NCR and track to closure with engineering approval.',
  'Conduct toolbox talk with crew and implement corrective measures.',
  'Repair damaged section and apply protective coating.',
  'Recalibrate instrument and verify readings against test gauge.',
  'Reinstall per manufacturer instructions and obtain QC sign-off.',
  'Update procedure documentation and retrain affected personnel.',
  'Conduct root cause analysis and implement preventive action.',
  'Engage specialist contractor for remediation works.',
  'Schedule replacement during next planned shutdown window.',
  'Apply temporary repair and raise MOC for permanent solution.',
];

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generate an array of realistic seed item data.
 * @param {number} count - Number of items to generate (default 500)
 * @returns {object[]} Array of item data objects ready for bulkCreateItems
 */
export function generateSeedData(count = 500) {
  const items = [];

  // Status weights: 25% Open, 20% In Progress, 10% Pending Approval, 15% Pending Verification, 25% Closed, 5% Cancelled
  const statusWeights = [25, 20, 10, 15, 25, 5];

  // Type weights: 50% Project Action, 30% Punch Item, 20% Audit Finding
  const typeWeights = [50, 30, 20];

  for (let i = 0; i < count; i++) {
    const itemType = weightedChoice(ITEM_TYPES, typeWeights);
    const status = weightedChoice(STATUS_OPTIONS, statusWeights);
    const likelihood = randomItem(LIKELIHOOD_OPTIONS);
    const consequence = randomItem(CONSEQUENCE_OPTIONS);
    const riskLevel = calculateRiskLevel(likelihood, consequence);
    const effortEstimate = randomItem(EFFORT_OPTIONS);

    // Pick a title template based on item type
    let title;
    if (itemType === 'Project Action') {
      title = fillTemplate(randomItem(ACTION_TITLES));
    } else if (itemType === 'Punch Item') {
      title = fillTemplate(randomItem(PUNCH_TITLES));
    } else {
      title = fillTemplate(randomItem(AUDIT_TITLES));
    }

    const assignedTo = randomItem(NAMES);
    const department = randomItem(DEPARTMENTS);
    const location = randomItem(LOCATIONS);
    const raisedBy = randomItem(NAMES.filter((n) => n !== assignedTo)) || NAMES[0];

    // Raised date: past 90 days
    const raisedDaysAgo = randomInt(1, 90);
    const raisedDate = dateOffset(-raisedDaysAgo);

    // Due date: spread from 30 days ago to 60 days in the future
    const dueDaysFromNow = randomInt(-30, 60);
    const dueDate = dateOffset(dueDaysFromNow);

    // Created at: same as raised date with random hour
    const createdAt = isoTimestampOffset(-raisedDaysAgo, randomInt(0, 12));

    // Effort hours based on estimate
    const effortHoursMap = { Low: randomInt(1, 8), Medium: randomInt(8, 40), High: randomInt(40, 200) };
    const effortHours = effortHoursMap[effortEstimate];

    const source = randomItem(SOURCES);
    const correctiveAction = randomItem(CORRECTIVE_ACTIONS);

    // Close-out fields for closed/cancelled items
    let closeOutDate = '';
    let closeOutNote = '';
    let verificationPerson = '';
    let verificationDate = '';
    let approvalStatus = 'Not Required';

    if (status === 'Closed') {
      const closeOffsetDays = randomInt(1, raisedDaysAgo);
      closeOutDate = dateOffset(-closeOffsetDays);
      closeOutNote = 'Verified and closed out per procedure.';
      verificationPerson = randomItem(NAMES.filter((n) => n !== assignedTo)) || NAMES[0];
      verificationDate = closeOutDate;
      approvalStatus = Math.random() > 0.5 ? 'Approved' : 'Not Required';
    } else if (status === 'Pending Verification') {
      verificationPerson = randomItem(NAMES.filter((n) => n !== assignedTo)) || NAMES[0];
      approvalStatus = Math.random() > 0.6 ? 'Pending Approval' : 'Not Required';
    } else if (status === 'Cancelled') {
      closeOutNote = 'Cancelled — scope change / no longer applicable.';
    }

    const priority = calculatePriority(effortEstimate, riskLevel) || '';

    items.push({
      itemType,
      title,
      description: `${title}. Refer to ${source} for details.`,
      riskLevel,
      likelihood,
      consequence,
      effortEstimate,
      effortHours,
      dueDate,
      assignedTo,
      department,
      location,
      correctiveAction,
      verificationPerson,
      verificationDate,
      status,
      approvalStatus,
      approver: approvalStatus === 'Approved' ? randomItem(NAMES) : '',
      closeOutDate,
      closeOutNote,
      raisedBy,
      raisedDate,
      source,
      priority,
      tags: '',
      createdAt,
      isArchived: false,
    });
  }

  return items;
}

/**
 * Seed the database with generated data.
 * @param {number} count - Number of items to generate
 * @returns {object[]} Created items
 */
export async function seedDatabase(count = 500) {
  const data = generateSeedData(count);
  return bulkCreateItems(data);
}
