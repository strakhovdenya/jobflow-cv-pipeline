import type { KnowledgeSourceEntry } from './knowledge-source-registration';

// The one list of active knowledge-source files (ISSUE-690): paths are relative to
// apps/api/knowledge-sources/. `npm run register-knowledge-sources` activates exactly these
// files, and the tests that read the real sources take their paths from here. A new source
// version changes only this list.
export const ACTIVE_KNOWLEDGE_SOURCES: readonly KnowledgeSourceEntry[] = [
  {
    relativePath: 'candidate-profile/Master_CV_RU_v0_8_portfolio_refresh.md',
    sourceType: 'master_cv',
    versionLabel: 'v0_8_portfolio_refresh',
  },
  {
    relativePath:
      'candidate-profile/Master_Profile_Summary_RU_v0_8_portfolio_refresh.md',
    sourceType: 'profile_summary',
    versionLabel: 'v0_8_portfolio_refresh',
  },
  {
    relativePath:
      'candidate-profile/LinkedIn_MD_Source_Decision_RU_v0_3_current_work_sync.md',
    sourceType: 'linkedin_source_decision',
    versionLabel: 'v0_3_current_work_sync',
  },
  {
    relativePath: 'evidence/Project_Inventory_RU_v0_8_portfolio_refresh.md',
    sourceType: 'project_inventory',
    versionLabel: 'v0_8_portfolio_refresh',
  },
  {
    relativePath:
      'evidence/Career_Case_Deep_Dives_RU_v0_9_portfolio_refresh.md',
    sourceType: 'career_cases',
    versionLabel: 'v0_9_portfolio_refresh',
  },
  {
    relativePath: 'evidence/Tech_Stack_Matrix_RU_v2_5_portfolio_refresh.md',
    sourceType: 'tech_stack',
    versionLabel: 'v2_5_portfolio_refresh',
  },
  {
    relativePath: 'cv-rules/CV_Format_Rules_EN_v0_7_portfolio_positioning.md',
    sourceType: 'cv_rules',
    versionLabel: 'v0_7_portfolio_positioning',
  },
  {
    relativePath:
      'certifications/LinkedIn_Certifications_Inventory_RU_EN_2026-11.md',
    sourceType: 'certifications',
    versionLabel: '2026-11',
  },
  {
    relativePath: 'layout/CV_Layout_Reference_EN_2026-06.pdf',
    sourceType: 'layout',
    versionLabel: '2026-06',
  },
];
