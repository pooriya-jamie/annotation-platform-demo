/*
 * Annotation Platform demo — synthetic data
 *
 * Every value in this file is fictitious. Accounts, posts, transcripts,
 * labels and receipts are invented for the demo and do not correspond to any
 * real person, account, post or study record. Label sets and form rules are
 * ported from the platform's codebook so the demo behaves like the product.
 */
window.DEMO_DATA = (function () {
  'use strict';
  const E = window.DemoEngine;

  const TODAY = '2026-09-23';

  const TOPICS = {
    MentalHealth: { key: 'MentalHealth', label: 'Mental Health', taxonomy: 'Basch-style mental-health social-media categories', short: 'MH' },
    Immigration: { key: 'Immigration', label: 'Immigration', taxonomy: 'Immigration Narrative Frames', short: 'IMM' },
    CancerMisinformation: { key: 'CancerMisinformation', label: 'Cancer misinformation', taxonomy: 'Cancer misinformation audit', short: 'CAN' },
  };

  const FIELD_TYPES = [
    ['single_choice', 'Pick exactly one option'],
    ['multi_choice', 'Pick any number of options'],
    ['boolean', 'Yes or no'],
    ['nullable_boolean', 'Yes, no, or not applicable'],
    ['tri_state', 'Yes, no, or unclear'],
    ['short_text', 'One line of text'],
    ['long_text', 'A paragraph of text'],
    ['number', 'A number within limits'],
    ['range', 'A number on a slider'],
    ['tags', 'A list of short tags'],
    ['repeatable_text', 'A list of text entries'],
    ['info', 'Guidance shown to the annotator (no answer)'],
  ];

  /* ------------------------------------------------------------------ */
  /* Shared option sets (config/taxonomies.json universal_fields)        */
  /* ------------------------------------------------------------------ */

  const opt = (id, label, definition) => (definition ? { id, label, definition } : { id, label });

  const RELEVANCE = [opt('on_topic', 'On topic'), opt('partially_related', 'Partially related'), opt('off_topic', 'Off topic'), opt('ambiguous', 'Ambiguous')];
  const GENRE = [
    opt('news', 'News'), opt('government_or_institutional', 'Government or institutional'), opt('academic_or_medical', 'Academic or medical'),
    opt('advocacy_or_ngo', 'Advocacy or NGO'), opt('personal_narrative', 'Personal narrative'), opt('social_media_post', 'Social media post'),
    opt('entertainment', 'Entertainment'), opt('commercial', 'Commercial'), opt('legal_service', 'Legal service'), opt('other', 'Other'),
  ];
  const STANCE = [opt('supportive_or_prosocial', 'Supportive or prosocial'), opt('neutral_or_informational', 'Neutral or informational'), opt('harmful_or_stigmatizing', 'Harmful or stigmatizing'), opt('mixed_or_unclear', 'Mixed or unclear')];
  const CONFIDENCE = [opt('high', 'High'), opt('medium', 'Medium'), opt('low', 'Low')];
  const RISK_FLAGS = [
    opt('none', 'None'), opt('misinformation', 'Misinformation'), opt('hate_or_discrimination', 'Hate or discrimination'), opt('fearmongering', 'Fearmongering'),
    opt('self_harm_or_suicide', 'Self-harm or suicide'), opt('harmful_medical_advice', 'Harmful medical advice'), opt('stigma', 'Stigma'),
    opt('commercial_exploitation', 'Commercial exploitation'), opt('graphic_or_disturbing_content', 'Graphic or disturbing content'),
  ];

  const MH_PRIMARY = [
    opt('general_mental_health', 'General Mental Health', 'Broad mental-health awareness, wellbeing, emotional health, or general discussion not focused on one condition.'),
    opt('anxiety_fear', 'Anxiety or Fear', 'Anxiety, panic, fear, worry, nervousness, or anxiety-related coping.'),
    opt('depression_low_mood', 'Depression or Low Mood', 'Depression, sadness, hopelessness, low mood, loneliness, or emotional numbness.'),
    opt('stress_burnout', 'Stress or Burnout', 'Stress, burnout, overwhelm, work/school pressure, or stress-management content.'),
    opt('suicide_crisis', 'Suicide or Crisis', 'Suicidal ideation, suicide prevention, crisis support, helplines, or imminent risk language.'),
    opt('self_harm', 'Self-Harm', 'Self-injury, self-harm experience, urges, recovery, or prevention.'),
    opt('interpersonal_relationships', 'Interpersonal Relationships', 'Loneliness, friendship, family conflict, breakup, social isolation, relationship distress, or social support.'),
    opt('physical_health_sleep_body', 'Physical Health, Sleep, or Body-Related Mental Health', 'Sleep, fatigue, pain, body image, physical health, or body-related concerns connected to mental health.'),
    opt('child_adolescent_mental_health', 'Child or Adolescent Mental Health', 'Mental-health content focused on children, teenagers, students, parents, or youth.'),
    opt('stigma_awareness', 'Stigma or Awareness', 'Mental-health stigma, stereotypes, awareness campaigns, normalization, or advocacy.'),
    opt('biological_neurological', 'Biological or Neurological Influences', 'Brain chemistry, neuroscience, hormones, genetics, ADHD/autism/neurodivergence, or biological explanations.'),
    opt('personal_experience', 'Personal Experience or Lived Experience', 'First-person stories, testimony, diary-style content, storytime, or lived experience.'),
    opt('coping_treatment', 'Coping, Therapy, or Treatment', 'Therapy, counseling, medication, coping skills, self-help, mindfulness, recovery, or treatment advice.'),
    opt('entertainment_music_mood', 'Entertainment, Music, or Mood Regulation', 'Songs, playlists, memes, entertainment, aesthetic content, or mood-related media using mental-health language.'),
    opt('misinformation_pseudoscience', 'Misinformation or Pseudoscience', 'Unsupported claims, fake cures, conspiracy claims, misleading diagnosis advice, or harmful non-evidence-based mental-health claims.'),
    opt('off_topic_ambiguous', 'Off-topic or Ambiguous', "Content triggered by the query but not actually about mental health, such as economic history results for 'great depression'."),
    opt('other', 'Other', 'Mental-health-related content that does not fit the other categories.'),
  ];
  const MH_CLINICAL = ['depressive_disorders', 'anxiety_disorders', 'trauma_stressor_related_disorders', 'obsessive_compulsive_related_disorders', 'substance_related_disorders', 'feeding_eating_disorders', 'sleep_wake_disorders', 'neurodevelopmental_disorders', 'psychotic_disorders', 'bipolar_related_disorders', 'personality_disorders', 'not_applicable', 'unclear'].map((id) => opt(id, E.titleCase(id)));

  const IMM_FRAMES = [
    opt('c0_neutral_informational', 'C0 - Neutral / Informational / Historical', 'On-topic immigration content that is factual, procedural, descriptive, or historical without an evaluative portrayal. Do not use C0 for off-topic content.'),
    opt('c1_equal_citizens_anti_xenophobia', 'C1 - Equal Citizens / Anti-Xenophobia', 'Presents immigrants as equal members of society and emphasizes rights, dignity, inclusion, opposition to discrimination, or contributions without reducing people to economic utility.'),
    opt('c2_humanitarian_suffering_victims', 'C2 - Humanitarian / Suffering Victims', 'Foregrounds suffering, displacement, poverty, exploitation, violence, discrimination, or family separation and encourages empathy or protection.'),
    opt('c3_security_criminality_threat', 'C3 - Security / Criminality Threat', 'Claims that immigrants or immigration create crime, terrorism, violence, danger, public disorder, or national-security risk.'),
    opt('c4_economic_resource_threat', 'C4 - Economic / Resource Threat', 'Presents immigrants as economic burdens or competitors for jobs, wages, taxes, welfare, housing, healthcare, schools, or other limited resources.'),
    opt('c5_cultural_symbolic_threat', 'C5 - Cultural / Symbolic Threat', 'Claims that immigration threatens national identity, religion, traditions, social cohesion, language, or shared values.'),
    opt('c6_illegality_essentialism', 'C6 - Illegality Essentialism', 'Defines immigrants principally as illegal or as lawbreakers and treats that status as an inherent moral fault or basis for punishment and exclusion. Neutral legal-status information belongs in C0.'),
    opt('c7_dehumanizing_metaphors', 'C7 - Dehumanizing Metaphors', "Uses animal, disaster, invasion, infestation, contamination, or similar mass imagery that reduces migrants' personhood, such as swarm, flood, or disease metaphors."),
    opt('c8_group_stereotypes', 'C8 - Racial / Ethnic / Religious / Gendered Stereotypes', 'Assigns generalized traits, inferiority, incompatibility, disease, or harmful behavior to immigrants based on race, ethnicity, nationality, religion, or gender.'),
    opt('c9_restrictionism_securitized_border', 'C9 - Restrictionism / Securitized Border', 'Advocates or legitimizes walls, bans, detention, deportation, coercive enforcement, punitive compliance, or highly restrictive immigration policy.'),
    opt('c10_labor_commodification', 'C10 - Labor Commodification / Exploitation', 'Treats migrants mainly as replaceable, flexible, or disposable labor, values them only for economic utility, or normalizes their exploitation.'),
  ];
  const IMM_RELATIONSHIP = [
    opt('endorses_or_advocates', 'Endorses or advocates', 'The creator or post supports, promotes, or argues for the selected primary frame.'),
    opt('reports_or_quotes_without_endorsement', 'Reports or quotes without endorsement', 'The selected frame is presented as news, documentation, or quoted speech without clear support from the creator or post.'),
    opt('challenges_or_rebuts', 'Challenges or rebuts', 'The creator or post presents the selected frame in order to criticize, reject, correct, or oppose it.'),
    opt('mixed_or_unclear', 'Mixed or unclear', "The creator's relationship to the selected frame is conflicting, ambiguous, sarcastic, or cannot be determined from the available evidence."),
    opt('not_applicable_neutral', 'Not applicable - neutral content', 'Use only with C0 when the on-topic item is neutral or informational and therefore has no advocated or challenged evaluative frame.'),
  ];

  const CANCER_TYPES = [
    opt('unproven_or_ineffective_treatment', 'Unproven or ineffective treatment', 'Recommends a cancer treatment, cure, prevention method, or substitute for medical care that lacks reliable scientific evidence of benefit.'),
    opt('misleading_or_selective_facts', 'Misleading or selective presentation of facts', 'Uses true, partly true, or research-based information in a distorted way, such as cherry-picking evidence, exaggerating results, or making broad claims beyond what evidence supports.'),
    opt('outdated_or_decontextualized_information', 'Outdated or decontextualized medical information', 'Presents old guidance, incomplete information, or medical facts without important context about risks, limits, or current standards of care.'),
    opt('conspiracy_claim', 'Conspiracy claim, such as a hidden cure', 'Claims that doctors, governments, pharmaceutical companies, or other institutions are hiding effective cancer cures or intentionally withholding treatment information.'),
    opt('promotional_or_commercial_advice', 'Promotional or commercial medical advice', 'Promotes, sells, or directs viewers toward a product, supplement, service, or program by presenting it as cancer-related medical advice without adequate evidence.'),
    opt('other', 'Other', 'Any other cancer-related claim that is false, inaccurate, misleading, or unsupported by current scientific evidence or medical consensus and could lead to harm.'),
  ];

  /* ------------------------------------------------------------------ */
  /* Forms (annotation_schemas.py legacy forms + cancer_misinformation)  */
  /* ------------------------------------------------------------------ */

  const universalSection = () => ({
    id: 'universal_classification',
    number: '01',
    title: 'Workflow and content assessment',
    description: "Record the item's workflow state and assess how the content relates to this domain.",
    fields: [
      { id: 'relevance', type: 'single_choice', label: 'Relevance', required: true, options: RELEVANCE },
      { id: 'content_genre', type: 'single_choice', label: 'Genre', required: true, options: GENRE },
      { id: 'stance_valence', type: 'single_choice', label: 'Stance / valence', required: true, options: STANCE },
      { id: 'confidence', type: 'single_choice', label: 'Confidence', required: true, options: CONFIDENCE },
    ],
  });

  const riskSection = (number) => ({
    id: 'risk_flags_and_notes',
    number,
    title: 'Risk flags and notes',
    description: 'Flag anything a reviewer should know about. None cannot be combined with another flag.',
    fields: [
      { id: 'risk_flags', type: 'multi_choice', label: 'Risk flags', options: RISK_FLAGS, default: ['none'] },
      { id: 'annotator_notes', type: 'long_text', label: 'Annotator notes', placeholder: 'Optional context, uncertainty, or evidence note' },
    ],
  });

  const notOffTopic = (require) => ({ rules: [{ field: 'relevance', operator: 'neq', value: 'off_topic' }], mode: 'all', effects: { show: true, require, disable: false, clear_when_hidden: true } });

  const FORMS = {
    MentalHealth: {
      topic: 'MentalHealth',
      version: 2,
      title: TOPICS.MentalHealth.taxonomy,
      settings: { agreement_field: 'mental_health_primary_category', skip_allowed: true },
      sections: [
        universalSection(),
        {
          id: 'domain_classification',
          number: '02',
          title: 'Domain classification',
          description: 'Choose the best primary category, then add any secondary labels supported by the evidence.',
          fields: [
            { id: 'mental_health_primary_category', type: 'single_choice', label: 'Primary label', required: true, options: MH_PRIMARY, primary: true },
            { id: 'mental_health_secondary_categories', type: 'multi_choice', label: 'Secondary labels', options: MH_PRIMARY },
            { id: 'clinical_condition_mapping', type: 'single_choice', label: 'Clinical mapping', options: MH_CLINICAL },
          ],
        },
        riskSection('03'),
      ],
      constraints: [{ type: 'exclusive_option', field: 'risk_flags', option: 'none', message: 'None cannot be combined with another risk flag.' }],
    },
    Immigration: {
      topic: 'Immigration',
      version: 3,
      title: TOPICS.Immigration.taxonomy,
      settings: { agreement_field: 'immigration_primary_frame', skip_allowed: true },
      sections: [
        universalSection(),
        {
          id: 'domain_classification',
          number: '02',
          title: 'Domain classification',
          description: 'Choose one dominant frame and, only when needed, one secondary frame.',
          fields: [
            { id: 'guidance', type: 'info', label: 'How to code this item', text: ['Annotate the complete creator post using the video or audio, caption, on-screen text, and visible imagery. Do not merge comment frames into the creator\'s frame.', 'Choose one dominant primary frame and at most one secondary frame. C0 is exclusive and only applies to on-topic neutral content.', 'Relationship describes how the creator or post relates to the primary frame, not whether quoted words are positive or negative.'] },
            { id: 'immigration_primary_frame', type: 'single_choice', label: 'Primary narrative frame', options: IMM_FRAMES, primary: true, conditions: notOffTopic(true) },
            { id: 'immigration_secondary_frames', type: 'multi_choice', label: 'Secondary narrative frame (optional, maximum one)', options: IMM_FRAMES, max_items: 1, conditions: notOffTopic(false) },
            { id: 'immigration_frame_relationship', type: 'single_choice', label: 'Relationship to the primary frame', options: IMM_RELATIONSHIP, conditions: notOffTopic(true) },
            { id: 'annotator_notes', type: 'long_text', label: 'Classification note (optional)', help: 'Add brief context about ambiguity, evidence, or why you selected this frame.' },
          ],
        },
      ],
      constraints: [
        { type: 'different_values', fields: ['immigration_primary_frame', 'immigration_secondary_frames'], message: 'The primary Immigration frame cannot also be secondary.' },
        { type: 'max_selections', field: 'immigration_secondary_frames', max_selections: 1, message: 'Choose at most 1 secondary Immigration frame.' },
        { type: 'forbidden_option', field: 'immigration_secondary_frames', option: 'c0_neutral_informational', message: 'The neutral C0 label is exclusive and cannot be secondary.' },
        { type: 'empty_when', field: 'immigration_secondary_frames', when_field: 'immigration_primary_frame', when_operator: 'eq', when_value: 'c0_neutral_informational', message: 'C0 is exclusive and cannot be combined with another frame.' },
        { type: 'allowed_values_when', field: 'immigration_frame_relationship', when_field: 'immigration_primary_frame', when_operator: 'eq', when_value: 'c0_neutral_informational', allowed_values: ['not_applicable_neutral'], message: 'C0 requires the neutral, not-applicable frame relationship.' },
        { type: 'allowed_values_when', field: 'immigration_frame_relationship', when_field: 'immigration_primary_frame', when_operator: 'neq', when_value: 'c0_neutral_informational', allowed_values: IMM_RELATIONSHIP.filter((o) => o.id !== 'not_applicable_neutral').map((o) => o.id), message: 'The neutral frame relationship can only be used with C0.' },
      ],
    },
    CancerMisinformation: {
      topic: 'CancerMisinformation',
      version: 1,
      title: 'Cancer Misinformation — Screenshot review',
      strictText: true,
      settings: { agreement_field: 'possible_misinformation', skip_allowed: true },
      sections: [
        {
          id: 'post_assessment',
          number: '01',
          title: 'Your assessment',
          description: 'Review all five screenshots as evidence from one post, then answer both questions.',
          fields: [
            { id: 'cancer_relevance', type: 'single_choice', label: 'Is this post relevant to cancer?', required: true, options: [opt('yes', 'Yes'), opt('no', 'No')], definition: 'A post is cancer-relevant when it directly discusses cancer of any type, cancer risk factors, prevention, symptoms, screening, diagnosis, prognosis, treatment, survivorship, recurrence, or alternative cancer therapies. Code No for general health, wellness, diet, emotional support, body image, illness, or medical content that does not clearly concern cancer.' },
            { id: 'possible_misinformation', type: 'single_choice', label: 'Does this post contain possible cancer misinformation?', required: true, primary: true, options: [opt('yes', 'Yes'), opt('no', 'No')], help: 'Select Yes only when cancer relevance is Yes. A cancer-relevant post does not necessarily contain misinformation.', definition: 'Cancer misinformation is information about cancer, its risk factors, prevention, diagnosis, or treatment that is false, inaccurate, misleading, or unsupported by current scientific evidence or medical consensus, and that may lead to harmful consequences. Do not code a personal cancer experience, emotional support post, or accurate medical information as misinformation simply because it is informal, incomplete, or non-clinical.' },
            { id: 'misinformation_types', type: 'multi_choice', label: 'Misinformation types', help: 'Select all that apply. At least one type is required when possible cancer misinformation is Yes.', min_items: 1, options: CANCER_TYPES, conditions: { rules: [{ field: 'possible_misinformation', operator: 'eq', value: 'yes' }], mode: 'all', effects: { show: true, require: true, disable: false, clear_when_hidden: true } } },
            { id: 'evidence_explanation', type: 'long_text', label: 'Evidence explanation', required: true, help: 'Briefly identify the specific text, claim, visual, or audio evidence that led to your decision. If you selected No for possible cancer misinformation, explain why the post appears accurate, non-medical, or unrelated to cancer.', placeholder: 'Briefly explain your decision using evidence from the supplied post.' },
          ],
        },
      ],
      constraints: [{ type: 'allowed_values_when', field: 'possible_misinformation', when_field: 'cancer_relevance', when_operator: 'neq', when_value: 'yes', allowed_values: ['no'], message: 'Possible cancer misinformation can be Yes only when cancer relevance is Yes.' }],
    },
  };

  /** Version history shown in Topics & Forms. */
  const FORM_VERSIONS = {
    MentalHealth: [
      { id: 'mh-v1', version: 1, status: 'published', publishedAt: '2026-03-14', summary: 'Initial 17-category form.' },
      { id: 'mh-v2', version: 2, status: 'active', publishedAt: '2026-08-07', summary: 'Added clinical mapping; risk flag "none" made exclusive.' },
    ],
    Immigration: [
      { id: 'imm-v2', version: 2, status: 'published', publishedAt: '2026-05-02', summary: 'C0–C10 narrative frames.' },
      { id: 'imm-v3', version: 3, status: 'active', publishedAt: '2026-06-18', summary: 'Relationship field made required; secondary frame limited to one.' },
      { id: 'imm-v4', version: 4, status: 'draft', publishedAt: null, summary: 'Clearer C6 wording, no rule changes.' },
    ],
    CancerMisinformation: [{ id: 'can-v1', version: 1, status: 'active', publishedAt: '2026-09-01', summary: 'Two-question screenshot review with evidence explanation.' }],
  };

  /* ------------------------------------------------------------------ */
  /* Accounts                                                            */
  /* ------------------------------------------------------------------ */

  const USERS = [
    { id: 'u-super', username: 'pooriya.jamie', name: 'Pooriya Jamie', role: 'admin', email: 'study-team@oasislab.example', topics: [], mhSafety: 'not_applicable', active: true, created: '2026-02-01' },
    { id: 'u-homa', username: 'homa.hosseinmardi', name: 'Homa Hosseinmardi', role: 'admin', email: 'h.hosseinmardi@oasislab.example', topics: [], mhSafety: 'not_applicable', active: true, created: '2026-02-01' },
    { id: 'u-amir', username: 'amir.ghasemian', name: 'Amir Ghasemian', role: 'admin', email: 'a.ghasemian@oasislab.example', topics: [], mhSafety: 'not_applicable', active: true, created: '2026-02-01' },
    { id: 'u-mgr', username: 'daniel.reyes', name: 'Daniel Reyes', role: 'manager', email: 'd.reyes@oasislab.example', topics: [], mhSafety: 'not_applicable', active: true, created: '2026-08-11', delegatedBy: 'Pooriya Jamie' },
    { id: 'u-demo', username: 'annotator.demo', name: 'Demo Annotator', role: 'annotator', email: 'demo@oasislab.example', topics: ['MentalHealth', 'Immigration', 'CancerMisinformation'], mhSafety: 'orientation_required', active: true, created: '2026-09-20' },
    { id: 'u-mira', username: 'annotator.mira', name: 'Mira Okafor', role: 'annotator', email: 'mira@oasislab.example', topics: ['MentalHealth', 'CancerMisinformation'], mhSafety: 'acknowledged', active: true, created: '2026-08-12' },
    { id: 'u-tomas', username: 'annotator.tomas', name: 'Tomás Lindqvist', role: 'annotator', email: 'tomas@oasislab.example', topics: ['MentalHealth', 'Immigration', 'CancerMisinformation'], mhSafety: 'acknowledged', active: true, created: '2026-08-12' },
    { id: 'u-lee', username: 'annotator.lee', name: 'Jordan Lee', role: 'annotator', email: 'jordan@oasislab.example', topics: ['Immigration', 'CancerMisinformation'], mhSafety: 'not_applicable', active: true, created: '2026-08-14' },
    { id: 'u-priya', username: 'annotator.priya', name: 'Priya Natarajan', role: 'annotator', email: 'priya@oasislab.example', topics: ['MentalHealth'], mhSafety: 'paused', active: true, created: '2026-08-20' },
    { id: 'u-kwame', username: 'annotator.kwame', name: 'Kwame Mensah', role: 'annotator', email: 'kwame@oasislab.example', topics: ['Immigration'], mhSafety: 'not_applicable', active: true, created: '2026-08-20' },
    { id: 'u-sofia', username: 'annotator.sofia', name: 'Sofia Marchetti', role: 'annotator', email: 'sofia@oasislab.example', topics: ['CancerMisinformation'], mhSafety: 'not_applicable', active: false, created: '2026-06-03' },
  ];

  /* ------------------------------------------------------------------ */
  /* Items: mild, synthetic posts                                         */
  /* ------------------------------------------------------------------ */

  // [title, primary label, genre, stance, platform, seed query]
  const MH_POSTS = [
    ['Three things that help me before an exam', 'stress_burnout', 'personal_narrative', 'supportive_or_prosocial', 'tiktok', 'exam stress'],
    ['Why I started going to bed an hour earlier', 'physical_health_sleep_body', 'personal_narrative', 'supportive_or_prosocial', 'youtube', 'sleep and mood'],
    ['A playlist for slow Sunday mornings', 'entertainment_music_mood', 'entertainment', 'neutral_or_informational', 'tiktok', 'calm playlist'],
    ['What a first counselling visit was actually like', 'coping_treatment', 'personal_narrative', 'supportive_or_prosocial', 'youtube', 'therapy first session'],
    ['Talking to a friend when everything feels like too much', 'interpersonal_relationships', 'social_media_post', 'supportive_or_prosocial', 'tiktok', 'feeling overwhelmed'],
    ['Campus wellbeing week: what is on', 'general_mental_health', 'government_or_institutional', 'neutral_or_informational', 'youtube', 'student wellbeing'],
    ['Five-minute breathing exercise for nervous mornings', 'anxiety_fear', 'coping_treatment' === 'x' ? '' : 'social_media_post', 'supportive_or_prosocial', 'tiktok', 'breathing exercise'],
    ['My study desk reset (small habits, big difference)', 'stress_burnout', 'entertainment', 'neutral_or_informational', 'tiktok', 'study habits'],
    ['How sleep debt changes your mood, explained', 'physical_health_sleep_body', 'academic_or_medical', 'neutral_or_informational', 'youtube', 'sleep and mood'],
    ['The "great depression" of 1929, a short history', 'off_topic_ambiguous', 'news', 'neutral_or_informational', 'youtube', 'depression'],
    ['Why we should stop saying "just cheer up"', 'stigma_awareness', 'advocacy_or_ngo', 'supportive_or_prosocial', 'tiktok', 'mental health stigma'],
    ['Journaling prompts for a low-energy week', 'coping_treatment', 'social_media_post', 'supportive_or_prosocial', 'tiktok', 'journaling'],
    ['Group chat energy: staying connected while studying abroad', 'interpersonal_relationships', 'personal_narrative', 'supportive_or_prosocial', 'youtube', 'loneliness abroad'],
    ['Does caffeine make worry worse? A pharmacist answers', 'anxiety_fear', 'academic_or_medical', 'neutral_or_informational', 'youtube', 'caffeine anxiety'],
    ['A teacher on helping teenagers manage exam nerves', 'child_adolescent_mental_health', 'academic_or_medical', 'supportive_or_prosocial', 'youtube', 'teen exam stress'],
    ['This crystal "fixes" your serotonin (claim)', 'misinformation_pseudoscience', 'commercial', 'harmful_or_stigmatizing', 'tiktok', 'serotonin boost'],
    ['Rainy-day lo-fi to work to', 'entertainment_music_mood', 'entertainment', 'neutral_or_informational', 'youtube', 'lofi study'],
    ['What burnout looked like for me as a nurse', 'stress_burnout', 'personal_narrative', 'supportive_or_prosocial', 'tiktok', 'burnout'],
    ['How the brain handles habit change, in two minutes', 'biological_neurological', 'academic_or_medical', 'neutral_or_informational', 'youtube', 'habit brain'],
    ['Free walk-in support hours at the community centre', 'coping_treatment', 'government_or_institutional', 'supportive_or_prosocial', 'youtube', 'free counselling'],
    ['Storytime: the semester I nearly dropped out', 'personal_experience', 'personal_narrative', 'supportive_or_prosocial', 'tiktok', 'college stress story'],
    ['Comment section: "everyone is a little anxious, no?"', 'general_mental_health', 'social_media_post', 'mixed_or_unclear', 'tiktok', 'anxiety normal'],
    ['Pet cam: the office dog who visits during deadlines', 'entertainment_music_mood', 'entertainment', 'supportive_or_prosocial', 'tiktok', 'office dog'],
    ['Screen time and sleep in kids: what the guidance says', 'child_adolescent_mental_health', 'academic_or_medical', 'neutral_or_informational', 'youtube', 'kids screen time'],
    ['A mindful commute: noticing five things', 'coping_treatment', 'social_media_post', 'supportive_or_prosocial', 'tiktok', 'mindfulness'],
    ['Ad: "detox tea" for stress (sponsored)', 'misinformation_pseudoscience', 'commercial', 'harmful_or_stigmatizing', 'tiktok', 'stress detox'],
    ['Loneliness after moving cities, and what helped', 'interpersonal_relationships', 'personal_narrative', 'supportive_or_prosocial', 'youtube', 'moving lonely'],
    ['Why ADHD can look different in adults', 'biological_neurological', 'academic_or_medical', 'neutral_or_informational', 'youtube', 'adult adhd'],
    ['Unboxing a weighted blanket (honest review)', 'physical_health_sleep_body', 'commercial', 'neutral_or_informational', 'youtube', 'weighted blanket'],
    ['Awareness month poster contest winners', 'stigma_awareness', 'advocacy_or_ngo', 'supportive_or_prosocial', 'tiktok', 'awareness month'],
  ];

  // [title, primary frame, relationship, genre, stance, platform, seed query]
  const IMM_POSTS = [
    ['City council votes on new language classes for newcomers', 'c0_neutral_informational', 'not_applicable_neutral', 'news', 'neutral_or_informational', 'youtube', 'immigration news'],
    ['A day at the community welcome centre', 'c1_equal_citizens_anti_xenophobia', 'endorses_or_advocates', 'advocacy_or_ngo', 'supportive_or_prosocial', 'tiktok', 'welcome centre'],
    ['Explainer: how a work visa is renewed', 'c0_neutral_informational', 'not_applicable_neutral', 'government_or_institutional', 'neutral_or_informational', 'youtube', 'work visa'],
    ['Op-ed argues for stricter border checks', 'c9_restrictionism_securitized_border', 'endorses_or_advocates', 'news', 'mixed_or_unclear', 'youtube', 'border policy'],
    ['Reporter quotes a mayor calling migrants a "burden on schools"', 'c4_economic_resource_threat', 'reports_or_quotes_without_endorsement', 'news', 'neutral_or_informational', 'tiktok', 'immigration schools'],
    ['Family reunited at the airport after four years', 'c2_humanitarian_suffering_victims', 'endorses_or_advocates', 'personal_narrative', 'supportive_or_prosocial', 'tiktok', 'family reunion'],
    ['Economist rebuts the "jobs are being taken" claim', 'c4_economic_resource_threat', 'challenges_or_rebuts', 'academic_or_medical', 'supportive_or_prosocial', 'youtube', 'immigrants jobs'],
    ['Farm owner: "we only need them at harvest"', 'c10_labor_commodification', 'endorses_or_advocates', 'news', 'harmful_or_stigmatizing', 'youtube', 'seasonal workers'],
    ['Recipe swap night at the neighbourhood association', 'c1_equal_citizens_anti_xenophobia', 'endorses_or_advocates', 'social_media_post', 'supportive_or_prosocial', 'tiktok', 'neighbourhood'],
    ['Timeline: a century of immigration law in three minutes', 'c0_neutral_informational', 'not_applicable_neutral', 'academic_or_medical', 'neutral_or_informational', 'youtube', 'immigration history'],
    ['Creator mocks a "flood of migrants" headline', 'c7_dehumanizing_metaphors', 'challenges_or_rebuts', 'entertainment', 'supportive_or_prosocial', 'tiktok', 'migrant headline'],
    ['Panel debate on border security spending', 'c9_restrictionism_securitized_border', 'mixed_or_unclear', 'news', 'mixed_or_unclear', 'youtube', 'border security'],
    ['Volunteer lawyers explain asylum interviews', 'c0_neutral_informational', 'not_applicable_neutral', 'legal_service', 'neutral_or_informational', 'youtube', 'asylum interview'],
    ['Short film: night shift at the port', 'c10_labor_commodification', 'challenges_or_rebuts', 'entertainment', 'supportive_or_prosocial', 'tiktok', 'migrant workers film'],
    ['Cooking video that happens to mention a visa', 'c0_neutral_informational', 'not_applicable_neutral', 'entertainment', 'neutral_or_informational', 'tiktok', 'visa vlog'],
    ['Column claims newcomers "will not adapt to our ways"', 'c5_cultural_symbolic_threat', 'endorses_or_advocates', 'news', 'harmful_or_stigmatizing', 'youtube', 'integration debate'],
    ['Student union welcomes international freshers', 'c1_equal_citizens_anti_xenophobia', 'endorses_or_advocates', 'government_or_institutional', 'supportive_or_prosocial', 'tiktok', 'international students'],
    ['Weather update filmed near a border town', 'c0_neutral_informational', 'not_applicable_neutral', 'news', 'neutral_or_informational', 'youtube', 'border town'],
    ['Charity appeal after the winter storm', 'c2_humanitarian_suffering_victims', 'endorses_or_advocates', 'advocacy_or_ngo', 'supportive_or_prosocial', 'youtube', 'refugee winter appeal'],
    ['Comedian riffs on paperwork at the consulate', 'c0_neutral_informational', 'not_applicable_neutral', 'entertainment', 'neutral_or_informational', 'tiktok', 'consulate comedy'],
    ['Talk show guest links a crime story to immigration', 'c3_security_criminality_threat', 'endorses_or_advocates', 'entertainment', 'harmful_or_stigmatizing', 'youtube', 'crime immigration'],
    ['Fact-check of the talk show claim', 'c3_security_criminality_threat', 'challenges_or_rebuts', 'news', 'supportive_or_prosocial', 'youtube', 'fact check'],
    ['How to register a newborn when parents hold different passports', 'c0_neutral_informational', 'not_applicable_neutral', 'government_or_institutional', 'neutral_or_informational', 'youtube', 'birth registration'],
    ['Nurse describes translating for patients', 'c1_equal_citizens_anti_xenophobia', 'endorses_or_advocates', 'personal_narrative', 'supportive_or_prosocial', 'tiktok', 'hospital interpreter'],
    ['"They came here illegally, end of story" (reaction video)', 'c6_illegality_essentialism', 'endorses_or_advocates', 'social_media_post', 'harmful_or_stigmatizing', 'tiktok', 'illegal immigration'],
    ['Historian on the word "illegal" in old newspapers', 'c6_illegality_essentialism', 'challenges_or_rebuts', 'academic_or_medical', 'neutral_or_informational', 'youtube', 'immigration language'],
    ['Football club fields three newly arrived players', 'c1_equal_citizens_anti_xenophobia', 'reports_or_quotes_without_endorsement', 'news', 'supportive_or_prosocial', 'tiktok', 'football club'],
    ['Ad for an immigration lawyer', 'c0_neutral_informational', 'not_applicable_neutral', 'legal_service', 'neutral_or_informational', 'youtube', 'immigration lawyer'],
    ['Vlog: my first week in a new country', 'c0_neutral_informational', 'not_applicable_neutral', 'personal_narrative', 'neutral_or_informational', 'tiktok', 'new country vlog'],
    ['Song lyrics video about leaving home', 'c2_humanitarian_suffering_victims', 'mixed_or_unclear', 'entertainment', 'mixed_or_unclear', 'youtube', 'leaving home song'],
  ];

  // [title, relevance, misinformation, types, platform, seed query]
  const CANCER_POSTS = [
    ['Doctor answers common screening questions', 'yes', 'no', [], 'tiktok', 'cancer screening'],
    ['"This tea cured my aunt" (family recipe video)', 'yes', 'yes', ['unproven_or_ineffective_treatment', 'promotional_or_commercial_advice'], 'tiktok', 'cancer cure tea'],
    ['Survivor shares a recovery walk routine', 'yes', 'no', [], 'tiktok', 'cancer recovery'],
    ['Ad for a "detox" supplement that "starves tumours"', 'yes', 'yes', ['unproven_or_ineffective_treatment', 'promotional_or_commercial_advice'], 'tiktok', 'detox tumour'],
    ['Sunscreen myths, explained by a dermatologist', 'yes', 'no', [], 'tiktok', 'skin cancer sunscreen'],
    ['"Doctors are hiding the real cure" (voiceover)', 'yes', 'yes', ['conspiracy_claim'], 'tiktok', 'hidden cancer cure'],
    ['Meal prep for chemo days (patient vlog)', 'yes', 'no', [], 'tiktok', 'chemo meals'],
    ['One study from 1998 "proves" a diet stops cancer', 'yes', 'yes', ['outdated_or_decontextualized_information', 'misleading_or_selective_facts'], 'tiktok', 'diet stops cancer'],
    ['Gym motivation clip (no medical content)', 'no', 'no', [], 'tiktok', 'gym motivation'],
    ['Mammogram appointment: what to expect', 'yes', 'no', [], 'tiktok', 'mammogram'],
    ['"Skip the biopsy, try this scan at home"', 'yes', 'yes', ['unproven_or_ineffective_treatment', 'promotional_or_commercial_advice'], 'tiktok', 'home cancer test'],
    ['Charity run for a children\'s hospital', 'yes', 'no', [], 'tiktok', 'cancer charity run'],
    ['Skincare routine vlog', 'no', 'no', [], 'tiktok', 'skincare'],
    ['Oncology nurse on managing nausea', 'yes', 'no', [], 'tiktok', 'chemo nausea'],
    ['Influencer: "phones in your pocket cause tumours"', 'yes', 'yes', ['misleading_or_selective_facts'], 'tiktok', 'phone radiation cancer'],
    ['Cooking with turmeric (flavour tips only)', 'no', 'no', [], 'tiktok', 'turmeric recipe'],
    ['Patient story: asking for a second opinion', 'yes', 'no', [], 'tiktok', 'second opinion'],
    ['"Big pharma buried the vitamin cure" (duet)', 'yes', 'yes', ['conspiracy_claim', 'unproven_or_ineffective_treatment'], 'tiktok', 'vitamin cancer cure'],
    ['Stretching after surgery: physio tips', 'yes', 'no', [], 'tiktok', 'post surgery stretching'],
    ['Quiz: how much do you know about HPV vaccines?', 'yes', 'no', [], 'tiktok', 'hpv vaccine'],
    ['Comedy sketch about waiting rooms', 'no', 'no', [], 'tiktok', 'waiting room comedy'],
    ['"Alkaline water changes your pH and kills cells"', 'yes', 'yes', ['unproven_or_ineffective_treatment', 'misleading_or_selective_facts'], 'tiktok', 'alkaline water cancer'],
    ['Support group meeting recap', 'yes', 'no', [], 'tiktok', 'cancer support group'],
    ['Weekend hike vlog', 'no', 'no', [], 'tiktok', 'hiking vlog'],
  ];

  const SENTENCES = {
    MentalHealth: ['I wanted to share what worked for me this term.', 'Nothing here is medical advice; it is just what helped.', 'Let me know in the comments what helps you.', 'Small habits added up over a few weeks.', 'The full guide is linked in the description.'],
    Immigration: ['Here is what happened at the meeting on Tuesday.', 'Sources are listed in the caption.', 'Opinions in the interview belong to the guest.', 'We will follow up next week.', 'Filmed with permission at a public event.'],
    CancerMisinformation: ['Please talk to your care team before changing anything.', 'This is my personal experience only.', 'Link in bio.', 'Screenshot 3 shows the on-screen text.', 'Comments have been turned off on this post.'],
  };

  function makeItems(topic, rows, prefix, rng) {
    return rows.map((row, index) => {
      const title = row[0];
      const platform = row[topic === 'CancerMisinformation' ? 4 : topic === 'Immigration' ? 5 : 4];
      const seedQuery = row[topic === 'CancerMisinformation' ? 5 : topic === 'Immigration' ? 6 : 5];
      const s = SENTENCES[topic];
      const lead = title.replace(/\s*\(.*?\)\s*/g, '').replace(/^"|"$/g, '');
      const transcript = lead + '. ' + E.pick(rng, s) + ' ' + E.pick(rng, s);
      const item = {
        id: prefix + '-' + String(index + 1).padStart(3, '0'),
        topic,
        externalId: prefix + '-' + String(417 + index),
        title,
        platform,
        mediaType: topic === 'CancerMisinformation' ? 'image' : index % 4 === 3 ? 'image' : 'video',
        seedQuery,
        rank: 1 + ((index * 7) % 12),
        snippet: transcript.split('. ')[0] + '.',
        description: 'Synthetic post created for the demo. ' + E.pick(rng, s),
        transcript,
        frames: topic === 'CancerMisinformation' ? 5 : 3 + (index % 3),
        durationSec: 18 + ((index * 13) % 70),
        sensitiveCover: topic === 'MentalHealth' && (index === 2 || index === 17),
        truth: {},
      };
      if (topic === 'MentalHealth') item.truth = { primary: row[1], genre: row[2], stance: row[3] };
      else if (topic === 'Immigration') item.truth = { primary: row[1], relationship: row[2], genre: row[3], stance: row[4] };
      else item.truth = { relevance: row[1], misinformation: row[2], types: row[3] };
      return item;
    });
  }

  const rngItems = E.mulberry32(E.fnv1a('annotation-demo-items'));
  const ITEMS = [].concat(
    makeItems('MentalHealth', MH_POSTS, 'mh', rngItems),
    makeItems('Immigration', IMM_POSTS, 'imm', rngItems),
    makeItems('CancerMisinformation', CANCER_POSTS, 'can', rngItems),
  );

  /* ------------------------------------------------------------------ */
  /* Datasets and tasks                                                  */
  /* ------------------------------------------------------------------ */

  const DATASETS = [
    { id: 'ds-mh-01', name: 'MH search pilot · September', topic: 'MentalHealth', itemCount: 30, withMedia: 30, videos: 22, uploadedAt: '2026-09-02', uploadedBy: 'Daniel Reyes', purpose: 'annotation' },
    { id: 'ds-imm-03', name: 'Immigration frames · Wave 3', topic: 'Immigration', itemCount: 30, withMedia: 30, videos: 23, uploadedAt: '2026-09-05', uploadedBy: 'Daniel Reyes', purpose: 'annotation' },
    { id: 'ds-can-b', name: 'Cancer screenshot set B', topic: 'CancerMisinformation', itemCount: 24, withMedia: 24, videos: 0, uploadedAt: '2026-09-10', uploadedBy: 'Pooriya Jamie', purpose: 'annotation' },
    { id: 'ds-imm-02', name: 'Immigration frames · Wave 2', topic: 'Immigration', itemCount: 30, withMedia: 30, videos: 21, uploadedAt: '2026-06-20', uploadedBy: 'Daniel Reyes', purpose: 'annotation' },
    { id: 'ds-mh-gold', name: 'MH training examples', topic: 'MentalHealth', itemCount: 10, withMedia: 10, videos: 7, uploadedAt: '2026-08-08', uploadedBy: 'Pooriya Jamie', purpose: 'training' },
  ];

  const TASKS = [
    {
      id: 't-mh-01', name: 'Mental Health · September pilot', topic: 'MentalHealth', datasetId: 'ds-mh-01', status: 'active', mode: 'item_split', overlap: 2,
      assignees: ['u-demo', 'u-mira', 'u-tomas'], formVersionId: 'mh-v2',
      instructions: 'Classify the post, not the person. Use only what is visible and audible. Use Needs expert review for content the protocol asks the study team to look at.',
    },
    {
      id: 't-imm-03', name: 'Immigration frames · Wave 3', topic: 'Immigration', datasetId: 'ds-imm-03', status: 'active', mode: 'explicit', overlap: 3,
      assignees: ['u-demo', 'u-tomas', 'u-lee'], formVersionId: 'imm-v3',
      instructions: 'Choose one dominant narrative frame for the creator\'s post. Do not merge comment frames into the creator\'s frame.',
    },
    {
      id: 't-can-b', name: 'Cancer misinformation · Screenshot set B', topic: 'CancerMisinformation', datasetId: 'ds-can-b', status: 'active', mode: 'item_split', overlap: 2,
      assignees: ['u-demo', 'u-mira', 'u-tomas', 'u-lee'], formVersionId: 'can-v1', thirdReviewer: 'u-lee',
      instructions: 'Review all five screenshots as evidence from one post. Do not search for the creator or other posts online.',
    },
    { id: 't-imm-02', name: 'Immigration frames · Wave 2', topic: 'Immigration', datasetId: 'ds-imm-02', status: 'archived', mode: 'item_split', overlap: 2, assignees: ['u-tomas', 'u-lee', 'u-kwame'], formVersionId: 'imm-v2', instructions: 'Archived after export on 2 Aug 2026.' },
    { id: 't-mh-00', name: 'Mental Health · calibration round', topic: 'MentalHealth', datasetId: 'ds-mh-01', status: 'paused', mode: 'explicit', overlap: 3, assignees: ['u-mira', 'u-tomas', 'u-priya'], formVersionId: 'mh-v2', instructions: 'Paused while the codebook wording for category 8 is discussed.' },
  ];

  /* ------------------------------------------------------------------ */
  /* Training: 5 worked examples + 5 practice items per domain           */
  /* ------------------------------------------------------------------ */

  function mhGold(item) {
    return { relevance: item.truth.primary === 'off_topic_ambiguous' ? 'off_topic' : 'on_topic', content_genre: item.truth.genre, stance_valence: item.truth.stance, confidence: 'high', mental_health_primary_category: item.truth.primary, mental_health_secondary_categories: [], clinical_condition_mapping: 'not_applicable', risk_flags: item.truth.primary === 'misinformation_pseudoscience' ? ['misinformation'] : ['none'] };
  }
  function immGold(item) {
    return { relevance: 'on_topic', content_genre: item.truth.genre, stance_valence: item.truth.stance, confidence: 'high', immigration_primary_frame: item.truth.primary, immigration_secondary_frames: [], immigration_frame_relationship: item.truth.relationship };
  }
  function canGold(item) {
    const g = { cancer_relevance: item.truth.relevance, possible_misinformation: item.truth.misinformation, evidence_explanation: item.truth.misinformation === 'yes' ? 'The on-screen text makes a treatment claim with no evidence and points viewers to a product.' : item.truth.relevance === 'yes' ? 'The post discusses cancer care factually and makes no unsupported claim.' : 'The post is not about cancer at all.' };
    if (item.truth.misinformation === 'yes') g.misinformation_types = item.truth.types;
    return g;
  }

  const GOLD_FN = { MentalHealth: mhGold, Immigration: immGold, CancerMisinformation: canGold };

  const EXPLANATIONS = {
    MentalHealth: ['The creator describes their own routine, so the primary label follows the topic of the routine, not the person.', 'Sleep is discussed as a mental-health factor, which is category 8 rather than general wellbeing.', 'A playlist that uses mood language but has no health claim is entertainment.', 'A first-person account of treatment is coded by its subject, therapy, with the personal story as a secondary label.', 'Support between friends is interpersonal, even when stress is mentioned.'],
    Immigration: ['Procedural, factual content with no evaluative portrayal is C0, and C0 always takes the neutral relationship.', 'Emphasising inclusion and contribution is C1; the creator advocates it.', 'A newspaper quoting an official is coded by the frame in the quote, with the relationship "reports without endorsement".', 'Arguing for stricter checks is C9, endorsed by the author.', 'Rebutting a resource-threat claim still uses the C4 frame, with the relationship "challenges or rebuts".'],
    CancerMisinformation: ['A clinician explaining screening is cancer-relevant and accurate: relevant Yes, misinformation No.', 'A family recipe presented as a cure is an unproven treatment and, because it sells a product, also promotional.', 'A recovery routine shares experience without a claim; relevant Yes, misinformation No.', 'Gym content with no medical claim is not cancer-relevant, so misinformation must be No.', 'A hidden-cure narrative is a conspiracy claim even when no product is sold.'],
  };

  function trainingFor(topic, ids) {
    return ids.map((id, i) => {
      const item = ITEMS.find((x) => x.id === id);
      return { itemId: id, answers: GOLD_FN[topic](item), explanation: EXPLANATIONS[topic][i % 5] };
    });
  }

  const TRAINING = {
    MentalHealth: { tutorial: trainingFor('MentalHealth', ['mh-001', 'mh-002', 'mh-003', 'mh-004', 'mh-005']), practice: trainingFor('MentalHealth', ['mh-006', 'mh-009', 'mh-011', 'mh-012', 'mh-016']) },
    Immigration: { tutorial: trainingFor('Immigration', ['imm-003', 'imm-002', 'imm-005', 'imm-004', 'imm-007']), practice: trainingFor('Immigration', ['imm-001', 'imm-006', 'imm-011', 'imm-016', 'imm-021']) },
    CancerMisinformation: { tutorial: trainingFor('CancerMisinformation', ['can-001', 'can-002', 'can-003', 'can-009', 'can-006']), practice: trainingFor('CancerMisinformation', ['can-004', 'can-005', 'can-008', 'can-013', 'can-010']) },
  };

  /* ------------------------------------------------------------------ */
  /* Mental Health safety policy (backend/app/safety_policy.py)          */
  /* ------------------------------------------------------------------ */

  const SAFETY_POLICY = {
    version: 'mental-health-safety-2026-08-07-v1',
    title: 'Before you begin Mental Health annotation',
    advisory: 'These tasks may include public social-media content about suicide, self-harm, trauma, abuse, eating disorders, grief, treatment, or severe distress. Individual reactions vary. Participation is voluntary, and you may pause, save and leave, or prefer not to view an item without giving a reason or being penalized.',
    contentTopics: ['Suicide or crisis language', 'Self-harm', 'Trauma or abuse', 'Eating disorders', 'Grief or severe distress', 'Mental-health treatment or misinformation'],
    boundaries: ['Classify the post, not the person, and do not infer a diagnosis.', 'Use only visible and audible evidence.', 'Do not investigate or contact a creator.', 'The research team does not monitor annotations in real time and the platform is not a crisis service.', 'Use Needs expert review for content that the approved research protocol asks the study team to review.'],
    choices: ['Take a break at any time.', 'Save unfinished work and leave the task.', 'Choose Prefer not to view without providing a reason; no replacement item will be assigned.', 'Stop Mental Health assignments if you also work in another domain, or leave the study if this is your only domain.'],
    sessionGuidance: 'Consider working in short sessions of about 5–10 items and taking a break between sessions.',
    resources: [
      { label: 'Research and task questions', description: 'Contact the study team. This inbox is not monitored for emergencies.', email: 'study-team@oasislab.example', emergency: false },
      { label: 'Questions about participant rights', description: 'The university human research protection office.', email: 'participant-rights@university.example', emergency: false },
      { label: 'Campus crisis support', description: 'Crisis and emergency resources for eligible students.', url: 'https://counseling.university.example', emergency: true },
      { label: '988 Suicide & Crisis Lifeline (U.S.)', description: 'Call or text 988, or use online chat, for immediate crisis support in the United States.', phone: '988', emergency: true },
      { label: 'Immediate danger', description: 'Contact local emergency services; call 911 in the United States.', phone: '911', emergency: true },
    ],
  };

  /* ------------------------------------------------------------------ */
  /* Consent                                                             */
  /* ------------------------------------------------------------------ */

  const CONSENT = {
    irb: 'IRB #00-000000 (synthetic)',
    version: 'consent-2026-08-v2',
    paragraphs: [
      'You are invited to take part in a research study run by OASIS Lab. The study asks trained annotators to label public social-media posts so researchers can study what people encounter online.',
      'What you will do: after a short training for each topic, you will view public posts (short videos, screenshots or transcripts) and answer a fixed set of questions about each one. Sessions take as long as you choose.',
      'Content: some posts may be upsetting, including content about health conditions, distress or political conflict. You may skip any item, take a break, or stop at any time. Skipping never counts against you.',
      'Your information: the platform records your username, your answers and when you saved them. It does not record your screen or your camera. Exports for analysis contain your username, not your name or email.',
      'Your rights: participation is voluntary. You may withdraw at any time by using the withdraw option in the platform or by contacting the study team; labels you already saved stay in the study record.',
      'Questions: contact the study team at study-team@oasislab.example. For questions about your rights as a participant, contact participant-rights@university.example.',
    ],
    confirmations: [
      'I have read and understood the information in this consent form.',
      'I am 18 years of age or older.',
      'I voluntarily agree to participate in this research.',
      'I understand that I may stop participating at any time without penalty.',
    ],
  };

  /* ------------------------------------------------------------------ */
  /* Seeded labels from the synthetic annotators                         */
  /* ------------------------------------------------------------------ */

  function otherOption(rng, options, current) {
    const others = options.filter((o) => o.id !== current);
    return E.pick(rng, others).id;
  }

  function synthAnswers(topic, item, rng, agreeProb) {
    const t = item.truth;
    if (topic === 'MentalHealth') {
      const agree = rng() < agreeProb;
      const primary = agree ? t.primary : otherOption(rng, MH_PRIMARY, t.primary);
      return { relevance: primary === 'off_topic_ambiguous' ? 'off_topic' : rng() < 0.9 ? 'on_topic' : 'partially_related', content_genre: t.genre, stance_valence: rng() < 0.85 ? t.stance : otherOption(rng, STANCE, t.stance), confidence: rng() < 0.6 ? 'high' : rng() < 0.7 ? 'medium' : 'low', mental_health_primary_category: primary, mental_health_secondary_categories: rng() < 0.3 ? [otherOption(rng, MH_PRIMARY, primary)] : [], clinical_condition_mapping: 'not_applicable', risk_flags: primary === 'misinformation_pseudoscience' ? ['misinformation'] : ['none'], annotator_notes: '' };
    }
    if (topic === 'Immigration') {
      const agree = rng() < agreeProb;
      const primary = agree ? t.primary : otherOption(rng, IMM_FRAMES, t.primary);
      const relationship = primary === 'c0_neutral_informational' ? 'not_applicable_neutral' : t.relationship === 'not_applicable_neutral' ? 'reports_or_quotes_without_endorsement' : t.relationship;
      return { relevance: 'on_topic', content_genre: t.genre, stance_valence: t.stance, confidence: rng() < 0.6 ? 'high' : 'medium', immigration_primary_frame: primary, immigration_secondary_frames: [], immigration_frame_relationship: relationship, annotator_notes: '' };
    }
    const relAgree = rng() < 0.85;
    const relevance = relAgree ? t.relevance : t.relevance === 'yes' ? 'no' : 'yes';
    let misinformation = rng() < agreeProb ? t.misinformation : t.misinformation === 'yes' ? 'no' : 'yes';
    if (relevance === 'no') misinformation = 'no';
    const out = { cancer_relevance: relevance, possible_misinformation: misinformation, evidence_explanation: misinformation === 'yes' ? 'The post makes a claim about treatment or cause that is not supported.' : relevance === 'yes' ? 'Cancer is discussed but no misleading claim is made.' : 'The post is not about cancer.' };
    if (misinformation === 'yes') out.misinformation_types = t.types.length ? t.types.slice(0, 1 + Math.floor(rng() * t.types.length)) : ['other'];
    return out;
  }

  function generateAnnotations(rng) {
    const annotations = [];
    const itemSplits = {};
    const agreeProb = { MentalHealth: 0.82, Immigration: 0.8, CancerMisinformation: 0.9 };
    let counter = 0;
    TASKS.forEach((task) => {
      if (task.status === 'archived') return;
      const items = ITEMS.filter((i) => i.topic === task.topic).slice(0, DATASETS.find((d) => d.id === task.datasetId).itemCount);
      const ids = items.map((i) => i.id);
      const split = task.mode === 'item_split' ? E.splitItems(ids, task.assignees, task.overlap) : Object.fromEntries(task.assignees.map((a) => [a, ids.slice()]));
      itemSplits[task.id] = split;
      task.assignees.forEach((annotatorId) => {
        if (annotatorId === 'u-demo') return;
        if (task.status === 'paused') return;
        split[annotatorId].forEach((itemId, index) => {
          const item = items.find((i) => i.id === itemId);
          counter += 1;
          const day = 3 + ((index * 3 + counter) % 15);
          const annotatedAt = '2026-09-' + String(day).padStart(2, '0') + 'T' + String(9 + (counter % 9)).padStart(2, '0') + ':' + String((counter * 7) % 60).padStart(2, '0') + ':00Z';
          let status = 'annotated';
          let skipReason = null;
          if (task.topic === 'MentalHealth' && annotatorId === 'u-mira' && index === 4) {
            status = 'skipped';
            skipReason = 'prefer_not_to_view';
          } else if (task.topic === 'MentalHealth' && annotatorId === 'u-tomas' && index === 7) {
            status = 'needs_review';
          } else if (rng() < 0.03) {
            status = 'skipped';
          }
          annotations.push({ id: 'a-' + task.id + '-' + annotatorId + '-' + itemId, taskId: task.id, itemId, annotatorId, status, skipReason, answers: status === 'skipped' ? {} : synthAnswers(task.topic, item, rng, agreeProb[task.topic]), annotatedAt });
        });
      });
    });
    return { annotations, itemSplits };
  }

  return {
    TODAY,
    TOPICS,
    FIELD_TYPES,
    FORMS,
    FORM_VERSIONS,
    USERS,
    ITEMS,
    DATASETS,
    TASKS,
    TRAINING,
    SAFETY_POLICY,
    CONSENT,
    MH_PRIMARY,
    IMM_FRAMES,
    RELEVANCE,
    generateAnnotations,
    itemById: (id) => ITEMS.find((i) => i.id === id),
  };
})();
