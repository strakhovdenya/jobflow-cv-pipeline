/**
 * One-off cleanup for ISSUE-284: WorkspacesService.createWorkspace previously created Company
 * and JobVacancy rows before the ApplicationWorkspace row that links them, with no transaction
 * and no rollback. Any failure on the last step (most commonly a duplicate workspaceSlug,
 * P2002) left orphaned Company/JobVacancy rows with no ApplicationWorkspace ever pointing at
 * them. The bug itself is fixed (createWorkspace now wraps all three creates in a single
 * prisma.$transaction), so this script only cleans up rows created before that fix.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-orphaned-vacancies.ts            # dry run, prints findings only
 *   npx ts-node scripts/cleanup-orphaned-vacancies.ts --apply    # deletes the orphaned rows
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const orphanedVacancies = await prisma.jobVacancy.findMany({
    where: { workspace: { is: null } },
    include: { company: true },
  });

  if (orphanedVacancies.length === 0) {
    console.log('No orphaned JobVacancy rows found.');
    await prisma.$disconnect();
    return;
  }

  console.log(
    `Found ${orphanedVacancies.length} orphaned JobVacancy row(s) (no linked ApplicationWorkspace):`,
  );
  for (const vacancy of orphanedVacancies) {
    console.log(
      `  - JobVacancy ${vacancy.id} ("${vacancy.roleTitleOriginal}") ` +
        `-> Company ${vacancy.companyId} ("${vacancy.company.nameOriginal}"), ` +
        `created ${vacancy.createdAt.toISOString()}`,
    );
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to delete these rows.');
    await prisma.$disconnect();
    return;
  }

  const orphanedCompanyIds = new Set(
    orphanedVacancies.map((v) => v.companyId),
  );

  await prisma.jobVacancy.deleteMany({
    where: { id: { in: orphanedVacancies.map((v) => v.id) } },
  });
  console.log(`Deleted ${orphanedVacancies.length} orphaned JobVacancy row(s).`);

  let deletedCompanies = 0;
  for (const companyId of orphanedCompanyIds) {
    const remainingVacancies = await prisma.jobVacancy.count({
      where: { companyId },
    });
    if (remainingVacancies === 0) {
      await prisma.company.delete({ where: { id: companyId } });
      deletedCompanies += 1;
    }
  }
  console.log(
    `Deleted ${deletedCompanies} Company row(s) left with no remaining vacancies.`,
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
