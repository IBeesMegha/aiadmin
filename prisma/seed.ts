/**
 * Database Seed Script
 * Creates initial roles, permissions, and developer super user
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Define all comprehensive permissions
const PERMISSIONS = [
  // Dashboard
  { name: 'View Dashboard', slug: 'dashboard.read', module: 'dashboard', action: 'read', description: 'View dashboard and analytics' },
  { name: 'Manage Dashboard', slug: 'dashboard.manage', module: 'dashboard', action: 'manage', description: 'Configure dashboard widgets' },
  
  // Users
  { name: 'View Users', slug: 'users.read', module: 'users', action: 'read', description: 'View user list' },
  { name: 'Create Users', slug: 'users.create', module: 'users', action: 'create', description: 'Create new users' },
  { name: 'Update Users', slug: 'users.update', module: 'users', action: 'update', description: 'Edit user details' },
  { name: 'Delete Users', slug: 'users.delete', module: 'users', action: 'delete', description: 'Delete users' },
  
  // Roles & Permissions
  { name: 'View Roles', slug: 'roles.read', module: 'roles', action: 'read', description: 'View roles list' },
  { name: 'Create Roles', slug: 'roles.create', module: 'roles', action: 'create', description: 'Create new roles' },
  { name: 'Update Roles', slug: 'roles.update', module: 'roles', action: 'update', description: 'Edit role details and permissions' },
  { name: 'Delete Roles', slug: 'roles.delete', module: 'roles', action: 'delete', description: 'Delete roles' },
  
  // Permissions
  { name: 'View Permissions', slug: 'permissions.read', module: 'permissions', action: 'read', description: 'View permissions list' },
  { name: 'Create Permissions', slug: 'permissions.create', module: 'permissions', action: 'create', description: 'Create new permissions' },
  { name: 'Update Permissions', slug: 'permissions.update', module: 'permissions', action: 'update', description: 'Edit permissions' },
  { name: 'Delete Permissions', slug: 'permissions.delete', module: 'permissions', action: 'delete', description: 'Delete permissions' },
  
  // Content
  { name: 'View Content', slug: 'content.read', module: 'content', action: 'read', description: 'View content entries' },
  { name: 'Create Content', slug: 'content.create', module: 'content', action: 'create', description: 'Create new content' },
  { name: 'Update Content', slug: 'content.update', module: 'content', action: 'update', description: 'Edit content' },
  { name: 'Delete Content', slug: 'content.delete', module: 'content', action: 'delete', description: 'Delete content' },
  { name: 'Publish Content', slug: 'content.publish', module: 'content', action: 'publish', description: 'Publish/unpublish content' },
  
  // Media Library
  { name: 'View Media', slug: 'media.read', module: 'media', action: 'read', description: 'View media library' },
  { name: 'Upload Media', slug: 'media.create', module: 'media', action: 'create', description: 'Upload media files' },
  { name: 'Update Media', slug: 'media.update', module: 'media', action: 'update', description: 'Edit media metadata' },
  { name: 'Delete Media', slug: 'media.delete', module: 'media', action: 'delete', description: 'Delete media files' },
  
  // Content-Type Builder
  { name: 'View Schema', slug: 'content_type_builder.read', module: 'content_type_builder', action: 'read', description: 'View content types' },
  { name: 'Create Schema', slug: 'content_type_builder.create', module: 'content_type_builder', action: 'create', description: 'Create content types' },
  { name: 'Update Schema', slug: 'content_type_builder.update', module: 'content_type_builder', action: 'update', description: 'Modify content types' },
  { name: 'Delete Schema', slug: 'content_type_builder.delete', module: 'content_type_builder', action: 'delete', description: 'Delete content types' },
  
  // Internationalization (i18n)
  { name: 'View Languages', slug: 'i18n.read', module: 'i18n', action: 'read', description: 'View language settings' },
  { name: 'Create Languages', slug: 'i18n.create', module: 'i18n', action: 'create', description: 'Add new languages' },
  { name: 'Update Languages', slug: 'i18n.update', module: 'i18n', action: 'update', description: 'Modify language settings' },
  { name: 'Delete Languages', slug: 'i18n.delete', module: 'i18n', action: 'delete', description: 'Remove languages' },
  
  // AI Agent
  { name: 'View AI Agent', slug: 'ai_agent.read', module: 'ai_agent', action: 'read', description: 'View AI chatbot and knowledge base' },
  { name: 'Create AI Content', slug: 'ai_agent.create', module: 'ai_agent', action: 'create', description: 'Create AI knowledge sources' },
  { name: 'Update AI Content', slug: 'ai_agent.update', module: 'ai_agent', action: 'update', description: 'Update AI knowledge sources' },
  { name: 'Delete AI Content', slug: 'ai_agent.delete', module: 'ai_agent', action: 'delete', description: 'Delete AI knowledge sources' },
  { name: 'Chat with AI', slug: 'ai_agent.chat', module: 'ai_agent', action: 'chat', description: 'Use AI chat functionality' },
  { name: 'Crawl Websites (AI)', slug: 'ai_agent.crawl', module: 'ai_agent', action: 'crawl', description: 'Crawl and index websites for AI' },
  
  // Knowledge Base
  { name: 'View Knowledge Base', slug: 'knowledge.read', module: 'knowledge', action: 'read', description: 'View knowledge base sources' },
  { name: 'Create Knowledge Base', slug: 'knowledge.create', module: 'knowledge', action: 'create', description: 'Create knowledge sources' },
  { name: 'Update Knowledge Base', slug: 'knowledge.update', module: 'knowledge', action: 'update', description: 'Update knowledge sources' },
  { name: 'Delete Knowledge Base', slug: 'knowledge.delete', module: 'knowledge', action: 'delete', description: 'Delete knowledge sources' },
  { name: 'Crawl Websites (KB)', slug: 'knowledge.crawl', module: 'knowledge', action: 'crawl', description: 'Crawl and index websites for knowledge base' },
  { name: 'Chat with Knowledge Base', slug: 'knowledge.chat', module: 'knowledge', action: 'chat', description: 'Use AI chat with knowledge base' },
  
  // FAQ
  { name: 'View FAQ', slug: 'faq.read', module: 'faq', action: 'read', description: 'View FAQ entries' },
  { name: 'Create FAQ', slug: 'faq.create', module: 'faq', action: 'create', description: 'Create FAQ entries' },
  { name: 'Update FAQ', slug: 'faq.update', module: 'faq', action: 'update', description: 'Edit FAQ entries' },
  { name: 'Delete FAQ', slug: 'faq.delete', module: 'faq', action: 'delete', description: 'Delete FAQ entries' },
  
  // Settings
  { name: 'View Settings', slug: 'settings.read', module: 'settings', action: 'read', description: 'View system settings' },
  { name: 'Manage Settings', slug: 'settings.manage', module: 'settings', action: 'manage', description: 'Access and modify settings' },
  { name: 'Update Settings', slug: 'settings.update', module: 'settings', action: 'update', description: 'Edit system settings' },
  
  // Theme Settings
  { name: 'View Theme', slug: 'theme.read', module: 'theme', action: 'read', description: 'View theme settings' },
  { name: 'Update Theme', slug: 'theme.update', module: 'theme', action: 'update', description: 'Customize theme settings' },
  
  // Internationalization
  { name: 'View Internationalization', slug: 'internationalization.read', module: 'internationalization', action: 'read', description: 'View and use internationalization features' },
  { name: 'Manage Internationalization', slug: 'internationalization.manage', module: 'internationalization', action: 'manage', description: 'Manage languages and translations' },
];

// Define roles with their permissions
const ROLES = [
  {
    name: 'Developer',
    slug: 'developer',
    description: 'Full system access with all permissions - Developer super user account',
    permissions: PERMISSIONS.map(p => p.slug), // ALL permissions
  },
];

// Define default languages
const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', isDefault: true, isActive: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', isDefault: false, isActive: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', isDefault: false, isActive: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', isDefault: false, isActive: false },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', isDefault: false, isActive: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', isDefault: false, isActive: false },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', isDefault: false, isActive: false },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', isDefault: false, isActive: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', isDefault: false, isActive: false },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', isDefault: false, isActive: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', isDefault: false, isActive: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', isDefault: false, isActive: false },
];

async function main() {
  console.log('🌱 Starting database seed...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create permissions
  console.log('📝 Creating permissions...');
  const createdPermissions = new Map();
  
  for (const perm of PERMISSIONS) {
    try {
      const permission = await prisma.permission.upsert({
        where: { slug: perm.slug },
        update: {
          name: perm.name,
          module: perm.module,
          description: perm.description,
        },
        create: perm,
      });
      createdPermissions.set(perm.slug, permission);
      console.log(`  ✓ ${perm.name} (${perm.slug})`);
    } catch (error: any) {
      // If there's a conflict, try to find by slug and update
      if (error.code === 'P2002') {
        const existing = await prisma.permission.findUnique({
          where: { slug: perm.slug },
        });
        if (existing) {
          createdPermissions.set(perm.slug, existing);
          console.log(`  ⏭️  ${perm.name} (${perm.slug}) - already exists`);
        } else {
          console.log(`  ❌ Skipped ${perm.slug} - conflict with existing data`);
        }
      } else {
        throw error;
      }
    }
  }
  
  console.log(`\n✅ Created/Updated ${PERMISSIONS.length} permissions\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create roles with permissions
  console.log('👥 Creating roles with permissions...\n');
  
  for (const roleData of ROLES) {
    const { permissions, ...roleInfo } = roleData;
    
    const role = await prisma.role.upsert({
      where: { slug: roleInfo.slug },
      update: roleInfo,
      create: roleInfo,
    });
    
    // Clear existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });
    
    // Assign permissions to role
    let assignedCount = 0;
    for (const permSlug of permissions) {
      const permission = createdPermissions.get(permSlug);
      if (permission) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
        assignedCount++;
      }
    }
    
    console.log(`  ✓ ${roleInfo.name}`);
    console.log(`    └─ ${assignedCount} permissions assigned`);
    console.log('');
  }
  
  console.log(`✅ Created/Updated ${ROLES.length} role\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create Developer super user
  console.log('👤 Creating Developer super user...\n');
  
  const developerRole = await prisma.role.findUnique({
    where: { slug: 'developer' },
  });

  if (!developerRole) {
    throw new Error('Developer role not found');
  }

  const existingDev = await prisma.user.findUnique({
    where: { email: 'dev@example.com' },
  });

  if (existingDev) {
    // Update existing user with developer role
    await prisma.user.update({
      where: { id: existingDev.id },
      data: { 
        roleId: developerRole.id,
        name: 'Developer',
        isActive: true,
      },
    });
    console.log('  ✓ Updated existing dev user with Developer role');
  } else {
    // Create new developer user
    const hashedPassword = await bcrypt.hash('Dev@123456', 12);
    
    await prisma.user.create({
      data: {
        email: 'dev@example.com',
        password: hashedPassword,
        name: 'Developer',
        roleId: developerRole.id,
        isActive: true,
      },
    });
    console.log('  ✓ Created new developer user');
  }

  console.log('\n✅ Developer user ready!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Developer Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:    dev@example.com');
  console.log('🔑 Password: Dev@123456');
  console.log('👤 Role:     Developer (ALL PERMISSIONS)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  IMPORTANT: Change this password after first login!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create languages
  console.log('🌍 Creating languages...');
  
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: lang,
      create: lang,
    });
    console.log(`  ✓ ${lang.flag} ${lang.name} (${lang.code})`);
  }
  
  console.log(`\n✅ Created/Updated ${LANGUAGES.length} languages\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🎉 Database seed completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  ✓ ${PERMISSIONS.length} permissions`);
  console.log(`  ✓ 1 Developer role (system protected)`);
  console.log(`  ✓ 1 developer super user`);
  console.log(`  ✓ ${LANGUAGES.length} languages`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🚀 Next Steps:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Start your application');
  console.log('  2. Login with dev@example.com');
  console.log('  3. Go to Settings → Roles & Permissions');
  console.log('  4. Create custom roles with specific permissions');
  console.log('  5. Create users and assign them roles');
  console.log('  6. Sync modules in Settings → Modules');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    console.error('\n' + error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
