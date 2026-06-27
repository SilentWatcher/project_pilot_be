import bcrypt from 'bcryptjs';
import { db, connectDB } from './src/config/db.js';

async function main() {
  await connectDB();
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);
  const memberPassword = await bcrypt.hash('member123', 12);

  const admin = await db.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@projectpilot.com',
      password: adminPassword,
      role: 'admin',
    },
  });

  const member = await db.user.create({
    data: {
      name: 'Member User',
      email: 'member@projectpilot.com',
      password: memberPassword,
      role: 'member',
    },
  });

  const project1 = await db.project.create({
    data: {
      title: 'Website Redesign',
      description: 'Complete redesign of the company website with modern UI/UX principles',
      deadline: new Date('2026-08-15'),
      status: 'active',
      createdBy: admin.id,
    },
  });

  const project2 = await db.project.create({
    data: {
      title: 'Mobile App Development',
      description: 'Build a cross-platform mobile application for iOS and Android',
      deadline: new Date('2026-09-30'),
      status: 'active',
      createdBy: admin.id,
    },
  });

  const project3 = await db.project.create({
    data: {
      title: 'API Integration',
      description: 'Integrate third-party payment gateway and analytics APIs',
      deadline: new Date('2026-07-01'),
      status: 'completed',
      createdBy: admin.id,
    },
  });

  const project4 = await db.project.create({
    data: {
      title: 'Data Migration',
      description: 'Migrate legacy database to new cloud infrastructure',
      deadline: new Date('2026-10-01'),
      status: 'active',
      createdBy: member.id,
    },
  });

  const tasks = [
    { title: 'Design homepage mockup', description: 'Create Figma mockups for homepage', priority: 'high', status: 'completed', projectId: project1.id, assignedTo: admin.id },
    { title: 'Implement responsive header', description: 'Build responsive navigation bar', priority: 'medium', status: 'in-progress', projectId: project1.id, assignedTo: admin.id },
    { title: 'Create contact form', description: 'Build and validate contact form', priority: 'low', status: 'pending', projectId: project1.id, assignedTo: member.id },
    { title: 'Setup React Native project', description: 'Initialize React Native with required dependencies', priority: 'high', status: 'in-progress', projectId: project2.id, assignedTo: admin.id },
    { title: 'Design app wireframes', description: 'Create wireframes for all screens', priority: 'medium', status: 'pending', projectId: project2.id, assignedTo: member.id },
    { title: 'Implement authentication', description: 'Add login and registration screens', priority: 'high', status: 'pending', projectId: project2.id, assignedTo: admin.id },
    { title: 'Stripe payment integration', description: 'Integrate Stripe checkout', priority: 'high', status: 'completed', projectId: project3.id, assignedTo: admin.id },
    { title: 'Database schema cleanup', description: 'Clean and optimize database tables', priority: 'medium', status: 'pending', projectId: project4.id, assignedTo: member.id },
  ];

  for (const task of tasks) {
    await db.task.create({ data: task });
  }

  console.log('Database seeded successfully!');
  console.log('Admin credentials: admin@projectpilot.com / admin123');
  console.log('Member credentials: member@projectpilot.com / member123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  });
