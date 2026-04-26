/* ============================================================
   seed.js — Database seeder script
   Populates the database with a demo user and sample
   applications so you can explore the app immediately.

   Usage:
     node backend/seed.js           → seed with demo data
     node backend/seed.js --clear   → wipe all data
   ============================================================ */

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose    = require('mongoose');
const bcrypt      = require('bcryptjs');
const User        = require('./models/User');
const Application = require('./models/Application');

/* ── Demo user ───────────────────────────────────────────── */
const DEMO_USER = {
  name:       'Alex Johnson',
  email:      'demo@campushireai.com',
  password:   'demo1234',               // Will be hashed before saving
  university: 'MIT'
};

/* ── Sample applications ─────────────────────────────────── */
const SAMPLE_APPS = [
  {
    company:     'Google',
    role:        'Software Engineering Intern',
    status:      'Interview',
    jobType:     'Internship',
    location:    'Mountain View, CA',
    dateApplied: daysAgo(5),
    deadline:    daysFromNow(10),
    notes:       'Phone screen done. Waiting for onsite invite. Prep DSA topics.',
    jobUrl:      'https://careers.google.com'
  },
  {
    company:     'Microsoft',
    role:        'Product Manager Intern',
    status:      'Applied',
    jobType:     'Internship',
    location:    'Redmond, WA (Remote)',
    dateApplied: daysAgo(3),
    deadline:    daysFromNow(14),
    notes:       'Applied via university portal. Referral from senior student.',
    jobUrl:      'https://careers.microsoft.com'
  },
  {
    company:     'Stripe',
    role:        'Backend Engineer Intern',
    status:      'Applied',
    jobType:     'Internship',
    location:    'San Francisco, CA',
    dateApplied: daysAgo(7),
    deadline:    null,
    notes:       'Applied through Stripe careers page. Waiting for response.',
    jobUrl:      'https://stripe.com/jobs'
  },
  {
    company:     'Figma',
    role:        'Frontend Engineer Intern',
    status:      'Offer',
    jobType:     'Internship',
    location:    'Remote',
    dateApplied: daysAgo(30),
    deadline:    null,
    salary:      '$8,500/month',
    notes:       '🎉 Offer received! Need to decide by next Friday. $8,500/mo stipend.',
    jobUrl:      'https://figma.com/careers'
  },
  {
    company:     'Notion',
    role:        'Design Intern',
    status:      'Rejected',
    jobType:     'Internship',
    location:    'New York, NY',
    dateApplied: daysAgo(20),
    deadline:    null,
    notes:       'Rejection after final round. Good experience — ask for feedback.',
    jobUrl:      'https://notion.so/careers'
  },
  {
    company:     'Airbnb',
    role:        'Data Science Intern',
    status:      'Applied',
    jobType:     'Internship',
    location:    'San Francisco, CA',
    dateApplied: daysAgo(1),
    deadline:    daysFromNow(7),
    notes:       'Referral from Professor Chen. Strong match for ML background.',
    jobUrl:      'https://careers.airbnb.com'
  },
  {
    company:     'Shopify',
    role:        'Full Stack Developer Intern',
    status:      'Interview',
    jobType:     'Internship',
    location:    'Remote',
    dateApplied: daysAgo(12),
    deadline:    daysFromNow(3),
    notes:       'Technical interview scheduled for next Tuesday. Review Ruby on Rails.',
    jobUrl:      'https://shopify.com/careers'
  },
  {
    company:     'Twilio',
    role:        'Developer Evangelist Intern',
    status:      'Applied',
    jobType:     'Internship',
    location:    'Remote',
    dateApplied: daysAgo(2),
    deadline:    daysFromNow(21),
    notes:       '',
    jobUrl:      ''
  },
];

/* ── Date helpers ────────────────────────────────────────── */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/* ── Main seed function ──────────────────────────────────── */
async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected\n');

    const shouldClear = process.argv.includes('--clear');

    if (shouldClear) {
      // Wipe everything
      await User.deleteMany({});
      await Application.deleteMany({});
      console.log('🗑️  All data cleared.\n');
      process.exit(0);
    }

    // ── Step 1: Remove existing demo user if present ──
    await User.deleteOne({ email: DEMO_USER.email });
    await Application.deleteMany({}); // Clear all apps for clean slate

    // ── Step 2: Create the demo user ─────────────────
    // Hash password manually (pre-save hook runs on .save(), not .create() with plain object)
    const salt     = await bcrypt.genSalt(12);
    const hashed   = await bcrypt.hash(DEMO_USER.password, salt);
    const user     = await User.create({ ...DEMO_USER, password: hashed });

    console.log(`👤 Demo user created:`);
    console.log(`   Email:    ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_USER.password}\n`);

    // ── Step 3: Create sample applications ───────────
    const appsWithUser = SAMPLE_APPS.map(app => ({ ...app, user: user._id }));
    const created      = await Application.insertMany(appsWithUser);

    console.log(`📋 Created ${created.length} sample applications:\n`);
    created.forEach(app => {
      const statusIcon = { Applied:'🔵', Interview:'🟡', Offer:'🟢', Rejected:'🔴' }[app.status] || '⚪';
      console.log(`   ${statusIcon} ${app.company} — ${app.role} (${app.status})`);
    });

    console.log('\n✅ Database seeded successfully!');
    console.log('\n🚀 Run the server:  npm run dev');
    console.log('🌐 Open frontend:   http://localhost:3000/pages/dashboard.html');
    console.log(`🔑 Login with:      ${DEMO_USER.email} / ${DEMO_USER.password}\n`);

  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();