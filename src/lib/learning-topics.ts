export interface CuratedTopic {
  id: string;
  topic: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'advanced';
  description: string;
  starterQuestions: string[];
  suggestedSearchQueries: string[];
}

export const LEARNING_CATEGORIES = [
  'Surprise Me',
  'AI & Technology',
  'Computer Science',
  'Research',
  'Science',
  'Psychology',
  'Finance',
  'Economics',
  'English',
  'General Knowledge',
  'History',
  'Health & Wellness',
  'Productivity',
  'Bangladesh',
  'World',
  'Career',
  'Everyday Life',
] as const;

export type LearningCategory = (typeof LEARNING_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<string, string> = {
  'Surprise Me': '✨',
  'AI & Technology': '🤖',
  'Computer Science': '💻',
  'Research': '🔬',
  'Science': '🌌',
  'Psychology': '🧠',
  'Finance': '📈',
  'Economics': '📊',
  'English': '✍️',
  'General Knowledge': '💡',
  'History': '🏛️',
  'Health & Wellness': '🌿',
  'Productivity': '⚡',
  'Bangladesh': '🇧🇩',
  'World': '🌍',
  'Career': '🎯',
  'Everyday Life': '☕',
};

export const CURATED_TOPICS: CuratedTopic[] = [
  // --- AI & Technology ---
  {
    id: 'ai-transformer-attention',
    topic: 'How does Transformer Self-Attention work?',
    category: 'AI & Technology',
    difficulty: 'advanced',
    description: 'The mathematical mechanism behind modern LLMs like GPT, Claude, and Gemini.',
    starterQuestions: [
      'What are queries, keys, and values in self-attention?',
      'How does attention allow tokens to dynamically focus on context?',
      'Why did transformers replace RNNs and LSTMs for sequence tasks?',
    ],
    suggestedSearchQueries: ['how transformer self attention works intuitive explanation', 'queries keys values attention mechanism illustrated'],
  },
  {
    id: 'ai-facial-recognition',
    topic: 'How does Facial Recognition work in modern systems?',
    category: 'AI & Technology',
    difficulty: 'medium',
    description: 'How neural networks detect facial landmarks and compute face embeddings for identification.',
    starterQuestions: [
      'What are facial feature embeddings and landmark detection?',
      'How do cosine similarity and vector distance determine a match?',
      'What are the primary ethical concerns regarding algorithmic bias?',
    ],
    suggestedSearchQueries: ['how facial recognition neural networks work embeddings', 'facial recognition computer vision step by step'],
  },
  {
    id: 'ai-reinforcement-learning',
    topic: 'What is Reinforcement Learning from Human Feedback (RLHF)?',
    category: 'AI & Technology',
    difficulty: 'advanced',
    description: 'The alignment technique that turns raw base models into helpful conversational assistants.',
    starterQuestions: [
      'What is the difference between supervised fine-tuning and RLHF?',
      'How does a reward model score generated responses?',
      'What is the PPO (Proximal Policy Optimization) step in alignment?',
    ],
    suggestedSearchQueries: ['RLHF explained simply step by step', 'reinforcement learning from human feedback reward model'],
  },
  {
    id: 'ai-diffusion-models',
    topic: 'How do Diffusion Models generate images from text?',
    category: 'AI & Technology',
    difficulty: 'medium',
    description: 'The reverse denoising process that creates images in Midjourney, DALL-E, and Stable Diffusion.',
    starterQuestions: [
      'What is forward diffusion (adding Gaussian noise)?',
      'How does a U-Net neural network predict and subtract noise in reverse?',
      'How does text conditioning steer the image generation?',
    ],
    suggestedSearchQueries: ['how diffusion models work intuitive explanation', 'stable diffusion denoising process explained'],
  },
  {
    id: 'ai-computer-vision-cnn',
    topic: 'How does a Convolutional Neural Network (CNN) analyze images?',
    category: 'AI & Technology',
    difficulty: 'medium',
    description: 'How convolutional kernels, pooling layers, and edge detectors extract spatial hierarchies in images.',
    starterQuestions: [
      'What is a convolution kernel filter?',
      'How do shallow layers detect edges while deep layers detect objects?',
      'What is the purpose of max pooling in spatial dimensionality reduction?',
    ],
    suggestedSearchQueries: ['convolutional neural network explained simply', 'how CNNs see images feature maps filters'],
  },
  {
    id: 'ai-edge-computing',
    topic: 'What is Edge AI and why does on-device intelligence matter?',
    category: 'AI & Technology',
    difficulty: 'easy',
    description: 'Running optimized machine learning models locally on smartphones and microchips instead of the cloud.',
    starterQuestions: [
      'What are the latency, bandwidth, and privacy advantages of on-device AI?',
      'How do quantization and model pruning shrink model weights?',
      'What devices already run Edge AI every day?',
    ],
    suggestedSearchQueries: ['edge AI vs cloud AI benefits examples', 'model quantization and pruning for edge computing'],
  },

  // --- Computer Science ---
  {
    id: 'cs-gps-trilateration',
    topic: 'How does GPS determine your location on Earth?',
    category: 'Computer Science',
    difficulty: 'easy',
    description: 'The geometry of satellite atomic clocks, radio signal speeds, and 3D sphere intersections.',
    starterQuestions: [
      'How does measuring radio signal travel time give distance from a satellite?',
      'Why do you need signals from at least 4 satellites for exact 3D positioning and clock correction?',
      'What is the difference between trilateration and triangulation?',
    ],
    suggestedSearchQueries: ['how GPS works trilateration 4 satellites', 'how GPS atomic clocks determine user coordinates'],
  },
  {
    id: 'cs-public-key-crypto',
    topic: 'How does Public-Key Cryptography (RSA & ECC) work?',
    category: 'Computer Science',
    difficulty: 'advanced',
    description: 'How asymmetric mathematical trapdoors allow secure encrypted communication over insecure networks.',
    starterQuestions: [
      'What is a one-way mathematical function (trapdoor permutation)?',
      'Why can someone encrypt with your public key, but only your private key can decrypt?',
      'How do digital signatures prove authorship and tamper resistance?',
    ],
    suggestedSearchQueries: ['public key cryptography explained intuitively', 'how RSA asymmetric encryption works mathematically'],
  },
  {
    id: 'cs-btree-databases',
    topic: 'How do Database Indexes (B-Trees) make queries blazing fast?',
    category: 'Computer Science',
    difficulty: 'medium',
    description: 'How self-balancing search trees reduce disk reads from millions of rows to a handful of lookups.',
    starterQuestions: [
      'Why is a full table scan O(N) while a B-Tree index lookup is O(log N)?',
      'How are nodes split and balanced as new records are inserted?',
      'When does adding an index actually slow down database performance?',
    ],
    suggestedSearchQueries: ['how B-tree database index works illustrated', 'why database indexes use b-trees vs binary search trees'],
  },
  {
    id: 'cs-zero-knowledge-proof',
    topic: 'What is a Zero-Knowledge Proof and how does it work?',
    category: 'Computer Science',
    difficulty: 'advanced',
    description: 'How to prove you know a secret or verify a computation without revealing any underlying data.',
    starterQuestions: [
      'What are the three core properties: completeness, soundness, and zero-knowledge?',
      'What is the classic Ali Baba cave analogy for zero-knowledge?',
      'Where are ZK-SNARKs and ZK-rollups used in real-world privacy and blockchains?',
    ],
    suggestedSearchQueries: ['zero knowledge proof explained for beginners', 'how zk snarks work simple analogy'],
  },
  {
    id: 'cs-git-internals',
    topic: 'How does Git actually store your code commits internally?',
    category: 'Computer Science',
    difficulty: 'medium',
    description: 'The directed acyclic graph (DAG) of immutable blobs, trees, commits, and SHA-1/256 hashes.',
    starterQuestions: [
      'What are Git blobs, trees, and commit objects in the .git folder?',
      'How is a Git commit a snapshot rather than a delta diff?',
      'How do Git branches simply act as movable pointers to commit hashes?',
    ],
    suggestedSearchQueries: ['git internals objects blobs trees commits explained', 'how git works under the hood DAG'],
  },
  {
    id: 'cs-how-wifi-works',
    topic: 'How does Wi-Fi transmit data through empty air?',
    category: 'Computer Science',
    difficulty: 'easy',
    description: 'Radio wave frequencies (2.4 GHz vs 5 GHz), orthogonal frequency modulation (OFDM), and packets.',
    starterQuestions: [
      'How are 1s and 0s modulated into electromagnetic radio waves?',
      'What causes Wi-Fi interference and signal attenuation through walls?',
      'What is the difference between 2.4 GHz, 5 GHz, and 6 GHz spectrum bands?',
    ],
    suggestedSearchQueries: ['how wifi works radio frequency modulation', 'difference between 2.4 ghz and 5 ghz wifi physics'],
  },

  // --- Psychology ---
  {
    id: 'psych-confirmation-bias',
    topic: 'What is Confirmation Bias and how does it distort reality?',
    category: 'Psychology',
    difficulty: 'medium',
    description: 'Why our brains subconsciously seek, interpret, and remember evidence that confirms existing beliefs.',
    starterQuestions: [
      'Why does the brain prioritize cognitive ease over objective truth?',
      'How does confirmation bias fuel polarization and algorithmic echo chambers?',
      'What debiasing techniques (such as red teaming or steelmanning) help counter it?',
    ],
    suggestedSearchQueries: ['confirmation bias psychological mechanisms and examples', 'how to overcome confirmation bias steelmanning'],
  },
  {
    id: 'psych-survivorship-bias',
    topic: 'What is Survivorship Bias and the classic WWII armor puzzle?',
    category: 'Psychology',
    difficulty: 'easy',
    description: 'The logical error of focusing on winners that survived a process while overlooking invisible dropouts.',
    starterQuestions: [
      'How did statistician Abraham Wald solve the WWII bomber armor problem?',
      'Why do successful startup founders and celebrity biographies suffer from survivorship bias?',
      'How does survivorship bias distort mutual fund return statistics?',
    ],
    suggestedSearchQueries: ['abraham wald survivorship bias airplanes armor', 'survivorship bias in business and investing examples'],
  },
  {
    id: 'psych-cognitive-load',
    topic: 'What is Cognitive Load Theory and how does memory bottleneck?',
    category: 'Psychology',
    difficulty: 'medium',
    description: 'The limits of working memory (4–7 chunks) and intrinsic, extraneous, and germane cognitive load.',
    starterQuestions: [
      'What is the distinction between working memory and long-term memory schema?',
      'What is the difference between intrinsic, extraneous, and germane load?',
      'How can instructional design reduce extraneous load to accelerate learning?',
    ],
    suggestedSearchQueries: ['cognitive load theory sweller intrinsic extraneous germane', 'how cognitive load affects learning and UI design'],
  },
  {
    id: 'psych-placebo-effect',
    topic: 'How does the Placebo Effect physically alter brain chemistry?',
    category: 'Psychology',
    difficulty: 'medium',
    description: 'Why expectations and conditioning trigger real biochemical cascades like endorphin release.',
    starterQuestions: [
      'What neurotransmitters (endorphins, dopamine) are released during a placebo response?',
      'What is the "nocebo effect" and how does negative expectation cause physical symptoms?',
      'Why are double-blind clinical trials essential in pharmaceutical testing?',
    ],
    suggestedSearchQueries: ['neurobiology of placebo effect endorphins dopamine', 'placebo and nocebo mechanisms in clinical trials'],
  },
  {
    id: 'psych-dunning-kruger',
    topic: 'What is the Dunning-Kruger Effect and the metacognitive trap?',
    category: 'Psychology',
    difficulty: 'easy',
    description: 'Why beginners often overestimate their competence while experts suffer from impostor syndrome.',
    starterQuestions: [
      'What is metacognition and why does lack of skill prevent recognizing one’s own errors?',
      'How does true expertise lead to recognizing how vast a domain truly is?',
      'How can continuous feedback loops protect learners from premature overconfidence?',
    ],
    suggestedSearchQueries: ['dunning kruger effect psychological studies and graph', 'metacognitive competence and confidence curve'],
  },
  {
    id: 'psych-neuroplasticity',
    topic: 'How does Neuroplasticity rewire the adult brain?',
    category: 'Psychology',
    difficulty: 'medium',
    description: 'The biological mechanism of synaptic pruning, long-term potentiation (LTP), and myelination.',
    starterQuestions: [
      'What does "neurons that fire together wire together" (Hebbian theory) mean?',
      'What role does myelin sheath insulation play in increasing nerve signal transmission speed?',
      'How does deliberate practice reshape cortical representations in adults?',
    ],
    suggestedSearchQueries: ['how neuroplasticity works long term potentiation myelination', 'adult neuroplasticity deliberate practice mechanism'],
  },

  // --- Economics & Finance ---
  {
    id: 'econ-what-causes-inflation',
    topic: 'What causes Inflation and how do Central Banks combat it?',
    category: 'Economics',
    difficulty: 'medium',
    description: 'Demand-pull, cost-push, monetary expansion, and how interest rates cool aggregate demand.',
    starterQuestions: [
      'What is the difference between demand-pull and cost-push inflation?',
      'How does increasing central bank interest rates reduce borrowing and slow consumer spending?',
      'What is the wage-price spiral and inflation expectations feedback loop?',
    ],
    suggestedSearchQueries: ['causes of inflation demand pull cost push monetary policy', 'how central bank interest rate hikes reduce inflation'],
  },
  {
    id: 'fin-compound-interest',
    topic: 'How does Compound Interest create exponential wealth growth?',
    category: 'Finance',
    difficulty: 'easy',
    description: 'The mathematics of earning interest on interest, the Rule of 72, and the power of time horizon.',
    starterQuestions: [
      'What is the formula for compound interest versus simple interest?',
      'How does the Rule of 72 approximate doubling time (72 / annual rate)?',
      'Why is starting 10 years earlier dramatically more powerful than investing twice as much later?',
    ],
    suggestedSearchQueries: ['compound interest formula rule of 72 explained', 'power of compounding time horizon vs capital invested'],
  },
  {
    id: 'econ-opportunity-cost',
    topic: 'What is Opportunity Cost and Comparative Advantage?',
    category: 'Economics',
    difficulty: 'easy',
    description: 'The hidden cost of the next best foregone alternative and how global trade unlocks efficiency.',
    starterQuestions: [
      'How does calculating opportunity cost improve daily decision-making?',
      'What is the difference between absolute advantage and comparative advantage (David Ricardo)?',
      'Why does specialization and trade benefit both parties even if one is more productive at everything?',
    ],
    suggestedSearchQueries: ['opportunity cost economic concept examples', 'comparative advantage david ricardo explained simply'],
  },
  {
    id: 'econ-pareto-principle',
    topic: 'What is the Pareto Principle (80/20 Rule) in power-law systems?',
    category: 'Economics',
    difficulty: 'easy',
    description: 'Why 80% of consequences often come from 20% of causes across wealth, code bugs, and productivity.',
    starterQuestions: [
      'How did Vilfredo Pareto first discover power-law distribution in land ownership and pea pods?',
      'Where does the 80/20 distribution naturally emerge in software engineering and business sales?',
      'How can identifying high-leverage 20% inputs maximize output in learning?',
    ],
    suggestedSearchQueries: ['pareto principle 80 20 rule power law distribution', 'how to apply pareto principle in learning and productivity'],
  },
  {
    id: 'fin-index-funds-vs-active',
    topic: 'Why do Passive Index Funds consistently outperform Active Managers?',
    category: 'Finance',
    difficulty: 'medium',
    description: 'The Efficient Market Hypothesis, expense ratio friction, and Warren Buffett’s famous 10-year bet.',
    starterQuestions: [
      'What is John Bogle’s indexing philosophy behind the creation of Vanguard?',
      'How do management fees (1-2%) compound into massive losses over 30 years?',
      'Why does the SPIVA scorecard show that 85-90% of active fund managers fail to beat the S&P 500?',
    ],
    suggestedSearchQueries: ['why index funds beat active managers spiva scorecard', 'john bogle index fund philosophy expense ratios'],
  },
  {
    id: 'econ-currency-exchange-rates',
    topic: 'Why do Currencies fluctuate in value on Foreign Exchange (Forex)?',
    category: 'Economics',
    difficulty: 'medium',
    description: 'Floating exchange rates, trade balances, interest rate differentials, and foreign reserves.',
    starterQuestions: [
      'How do supply and demand in international trade influence currency valuation?',
      'How does a higher domestic interest rate attract foreign capital and strengthen a currency?',
      'What is purchasing power parity (PPP) and the Big Mac Index?',
    ],
    suggestedSearchQueries: ['what determines currency exchange rates floating vs pegged', 'purchasing power parity interest rate differentials forex'],
  },

  // --- Science & Nature ---
  {
    id: 'sci-black-holes-event-horizon',
    topic: 'What happens at the Event Horizon of a Black Hole?',
    category: 'Science',
    difficulty: 'medium',
    description: 'General relativity, gravitational time dilation, spaghettification, and Hawking radiation.',
    starterQuestions: [
      'What is the Schwarzschild radius and escape velocity exceeding the speed of light?',
      'How does gravitational time dilation cause an outside observer to see an infalling object freeze?',
      'What is Hawking Radiation and how do quantum fluctuations cause black holes to slowly evaporate?',
    ],
    suggestedSearchQueries: ['physics of black hole event horizon time dilation', 'hawking radiation quantum fluctuations explained'],
  },
  {
    id: 'sci-crispr-gene-editing',
    topic: 'How does CRISPR-Cas9 Gene Editing work at molecular scale?',
    category: 'Science',
    difficulty: 'advanced',
    description: 'Bacterial immune systems, guide RNA targeting, and precision molecular DNA scissors.',
    starterQuestions: [
      'How did bacteria evolve CRISPR to remember and cut bacteriophage viral DNA?',
      'What is the role of the Guide RNA (gRNA) and PAM sequence in guiding the Cas9 enzyme?',
      'What are the medical potentials for curing genetic diseases vs germline ethical dilemmas?',
    ],
    suggestedSearchQueries: ['how crispr cas9 gene editing works molecular mechanism', 'crispr bacterial immune system guide rna mechanism'],
  },
  {
    id: 'sci-mrna-vaccines',
    topic: 'How do mRNA Vaccines teach our cells to defend against viruses?',
    category: 'Science',
    difficulty: 'medium',
    description: 'Lipid nanoparticles, cellular ribosomes, antigen spike protein synthesis, and antibody memory.',
    starterQuestions: [
      'Why are mRNA instructions packaged inside lipid nanoparticles (LNPs)?',
      'How do ribosomes read mRNA transcripts to produce harmless viral spike proteins?',
      'Why does mRNA degrade quickly within hours without modifying genomic DNA?',
    ],
    suggestedSearchQueries: ['how mrna vaccines work ribosomes lipid nanoparticles', 'difference between mrna vaccines and traditional viral vaccines'],
  },
  {
    id: 'sci-carbon-capture',
    topic: 'How does Direct Air Carbon Capture (DAC) technology work?',
    category: 'Science',
    difficulty: 'medium',
    description: 'Chemical sorbents, chemical bonding with atmospheric CO2, and deep geological storage.',
    starterQuestions: [
      'What are the liquid amine and solid sorbent chemical filters used to bind CO2?',
      'How is captured CO2 mineralized into basalt rock or utilized in synthetic fuels?',
      'What are the energy consumption and economic cost challenges of scaling DAC worldwide?',
    ],
    suggestedSearchQueries: ['how direct air carbon capture technology works', 'carbon mineralization basalt rock direct air capture cost'],
  },
  {
    id: 'sci-airplane-contrails',
    topic: 'Why do Airplanes leave white trails (Contrails) in the sky?',
    category: 'Science',
    difficulty: 'easy',
    description: 'Jet engine combustion, water vapor crystallization, atmospheric supersaturation, and cirrus clouds.',
    starterQuestions: [
      'How does burning hydrocarbon jet fuel produce water vapor and carbon dioxide?',
      'Why does rapid cooling in the freezing upper troposphere form ice crystals around soot particles?',
      'Why do some contrails vanish in seconds while others persist and expand into clouds?',
    ],
    suggestedSearchQueries: ['why airplanes leave contrails atmospheric physics', 'persistent vs short lived airplane contrails water vapor'],
  },

  // --- Research & Scientific Thinking ---
  {
    id: 'res-correlation-vs-causation',
    topic: 'Why is Correlation not Causation and what is a Confounder?',
    category: 'Research',
    difficulty: 'easy',
    description: 'Spurious correlations, lurking variables, reverse causality, and counterfactual reasoning.',
    starterQuestions: [
      'What is a confounding variable (e.g., ice cream sales and drowning rates linked by summer temperature)?',
      'What is reverse causality and directionality problem in observational studies?',
      'How do Randomized Controlled Trials (RCTs) isolate causal variables?',
    ],
    suggestedSearchQueries: ['correlation vs causation confounding variables examples', 'how randomized controlled trials prove causality'],
  },
  {
    id: 'res-replication-crisis',
    topic: 'What is the Replication Crisis and P-Hacking in scientific research?',
    category: 'Research',
    difficulty: 'advanced',
    description: 'Why many published study findings cannot be reproduced and how pre-registration is fixing it.',
    starterQuestions: [
      'What is the p-value threshold (p < 0.05) and how does p-hacking manipulate data to reach it?',
      'What is publication bias (the "file drawer problem" where negative results are buried)?',
      'How do pre-registered reports, open data, and registered replications restore research integrity?',
    ],
    suggestedSearchQueries: ['replication crisis in psychology and science p hacking', 'file drawer problem publication bias pre registration'],
  },
  {
    id: 'res-systematic-literature-review',
    topic: 'How do Systematic Reviews and Meta-Analyses synthesize evidence?',
    category: 'Research',
    difficulty: 'medium',
    description: 'The hierarchy of medical and scientific evidence from case studies up to forest plots.',
    starterQuestions: [
      'What is the hierarchy of evidence pyramid in scientific research?',
      'How do PRISMA guidelines govern systematic inclusion and exclusion criteria?',
      'What is a forest plot and how does a meta-analysis pool effect sizes across multiple studies?',
    ],
    suggestedSearchQueries: ['hierarchy of evidence systematic review meta analysis', 'how to read a forest plot in meta analysis'],
  },

  // --- Health & Wellness ---
  {
    id: 'health-sleep-memory-consolidation',
    topic: 'Why does Sleep consolidate memory and cleanse the brain?',
    category: 'Health & Wellness',
    difficulty: 'medium',
    description: 'Slow-wave sleep, hippocampal memory replay, and the glymphatic waste clearance system.',
    starterQuestions: [
      'How does the brain transfer short-term memories from the hippocampus to the neocortex during NREM sleep?',
      'What is the glymphatic system and how does cerebral spinal fluid wash away amyloid-beta proteins during deep sleep?',
      'How does REM sleep stimulate creative problem-solving and emotional regulation?',
    ],
    suggestedSearchQueries: ['how sleep consolidates memory hippocampus neocortex', 'glymphatic system brain waste clearance deep sleep'],
  },
  {
    id: 'health-microbiome-gut-brain',
    topic: 'How does the Gut Microbiome communicate with the Brain?',
    category: 'Health & Wellness',
    difficulty: 'medium',
    description: 'The vagus nerve, short-chain fatty acids (SCFAs), and serotonin production in the enteric nervous system.',
    starterQuestions: [
      'Why is over 90% of the body’s serotonin synthesized in the digestive tract?',
      'How does the vagus nerve act as a bidirectional superhighway between gut bacteria and the brain?',
      'What role do dietary fibers and fermented foods play in generating beneficial short-chain fatty acids?',
    ],
    suggestedSearchQueries: ['gut brain axis vagus nerve neurotransmitters', 'how gut microbiome affects mood and cognition SCFAs'],
  },
  {
    id: 'health-zone-2-cardio',
    topic: 'What is Zone 2 Cardiovascular Training and Mitochondrial Density?',
    category: 'Health & Wellness',
    difficulty: 'easy',
    description: 'Aerobic base building, lactate clearance, fat oxidation, and longevity fitness.',
    starterQuestions: [
      'What heart rate percentage and conversational effort define Zone 2 aerobic exercise?',
      'How does Zone 2 training trigger mitochondrial biogenesis (growth of new cellular powerhouses)?',
      'Why do elite endurance athletes spend 80% of their training volume in low-intensity Zone 2?',
    ],
    suggestedSearchQueries: ['zone 2 cardio training benefits mitochondrial density', 'how to measure zone 2 heart rate lactate clearance'],
  },
  {
    id: 'health-circadian-rhythm-light',
    topic: 'How does Morning Sunlight set your Circadian Rhythm?',
    category: 'Health & Wellness',
    difficulty: 'easy',
    description: 'Intrinsically photosensitive retinal ganglion cells (ipRGCs), melanopsin, cortisol, and melatonin timing.',
    starterQuestions: [
      'How do ipRGC cells in the eyes signal the suprachiasmatic nucleus (SCN) master clock in the brain?',
      'Why does viewing bright morning photons trigger an early cortisol pulse and start a 14-hour melatonin timer?',
      'How does artificial blue light after sunset suppress melatonin and disrupt sleep architecture?',
    ],
    suggestedSearchQueries: ['morning sunlight circadian rhythm suprachiasmatic nucleus', 'melanopsin ipRGC retinal ganglion cells melatonin timing'],
  },

  // --- Productivity & Learning ---
  {
    id: 'prod-feynman-technique',
    topic: 'What is the Feynman Technique for rapid mastery of complex topics?',
    category: 'Productivity',
    difficulty: 'easy',
    description: 'Simplification, teaching to a beginner, identifying blind spots, and analogical synthesis.',
    starterQuestions: [
      'What are Richard Feynman’s four steps for mastering any conceptual subject?',
      'Why does using jargon often mask incomplete understanding?',
      'How does formulating simple analogies expose knowledge gaps and build durable mental models?',
    ],
    suggestedSearchQueries: ['richard feynman technique learning method steps', 'how to use feynman technique to learn anything faster'],
  },
  {
    id: 'prod-deep-work-attention',
    topic: 'What is Attention Residue and how does Deep Work protect focus?',
    category: 'Productivity',
    difficulty: 'easy',
    description: 'Why multitasking is an illusion and how context switching leaves cognitive friction behind.',
    starterQuestions: [
      'What did Dr. Sophie Leroy’s research reveal about attention residue when switching tasks quickly?',
      'What is Cal Newport’s definition of Deep Work vs Shallow Work?',
      'How does creating dedicated 60–90 minute distraction-free blocks optimize cognitive flow states?',
    ],
    suggestedSearchQueries: ['attention residue sophie leroy multitasking cognitive cost', 'cal newport deep work principles and rules'],
  },
  {
    id: 'prod-spaced-repetition-ebbinghaus',
    topic: 'How does Spaced Repetition conquer the Ebbinghaus Forgetting Curve?',
    category: 'Productivity',
    difficulty: 'medium',
    description: 'Active recall, optimal inter-repetition intervals, and the SM-2 algorithm behind Anki.',
    starterQuestions: [
      'What is the exponential decay shape of the Hermann Ebbinghaus forgetting curve?',
      'Why does testing yourself just as you are about to forget strengthen memory traces most effectively?',
      'How do spaced repetition algorithms like SuperMemo (SM-2) adjust review intervals based on recall difficulty?',
    ],
    suggestedSearchQueries: ['ebbinghaus forgetting curve spaced repetition active recall', 'how spaced repetition algorithms sm2 work'],
  },

  // --- Bangladesh ---
  {
    id: 'bd-sundarbans-mangrove',
    topic: 'What makes the Sundarbans Mangrove Forest ecologically unique?',
    category: 'Bangladesh',
    difficulty: 'medium',
    description: 'The world’s largest contiguous mangrove wetland, tidal adaptation, and Bengal tiger sanctuary.',
    starterQuestions: [
      'How do mangrove trees adapt to high salinity and tidal inundation using pneumatophore breathing roots?',
      'How does the Sundarbans act as a natural coastal shield against destructive Bay of Bengal cyclones?',
      'What unique swimming and hunting adaptations do Royal Bengal tigers exhibit in the Sundarbans mangrove?',
    ],
    suggestedSearchQueries: ['sundarbans mangrove ecosystem ecology tidal adaptation', 'sundarbans cyclone protection royal bengal tiger habitat'],
  },
  {
    id: 'bd-language-movement-1952',
    topic: 'The 1952 Language Movement & International Mother Language Day',
    category: 'Bangladesh',
    difficulty: 'easy',
    description: 'How the historic February 21 movement in Dhaka inspired UNESCO’s global celebration of linguistic diversity.',
    starterQuestions: [
      'What was the historical context of the 1952 Bengali Language Movement at Dhaka University?',
      'How did the sacrifice of the language martyrs culminate in the constitutional recognition of Bangla?',
      'Why did UNESCO designate February 21 as International Mother Language Day worldwide in 1999?',
    ],
    suggestedSearchQueries: ['1952 language movement bangladesh history february 21', 'unesco international mother language day origin 1952 martyrs'],
  },
  {
    id: 'bd-jamdani-weaving',
    topic: 'The Heritage and Geometry of Traditional Jamdani Weaving',
    category: 'Bangladesh',
    difficulty: 'medium',
    description: 'The UNESCO Intangible Cultural Heritage of Mughal muslin supplementary-weft textile craftsmanship.',
    starterQuestions: [
      'How is Jamdani hand-woven on pit looms using supplementary weft motifs without modern mechanical printing?',
      'What historical connection does Jamdani have with the legendary Dhaka muslin of the Shitalakshya river basin?',
      'Why was Jamdani inscribed as a UNESCO Intangible Cultural Heritage of Humanity?',
    ],
    suggestedSearchQueries: ['jamdani weaving technique heritage shitalakshya river', 'unesco jamdani textile muslin history motifs'],
  },
  {
    id: 'bd-padma-bridge-engineering',
    topic: 'What engineering breakthroughs made the Padma Bridge possible?',
    category: 'Bangladesh',
    difficulty: 'advanced',
    description: 'Deepest pile foundations in global bridge engineering over the world’s most unpredictable riverbed.',
    starterQuestions: [
      'Why is the Padma River’s sandy alluvial silt bed one of the most challenging river crossings in civil engineering?',
      'How did engineers drive steel friction piles over 120 meters deep to withstand extreme scour depths?',
      'What is the double-deck truss design supporting both highway vehicles on top and high-speed rail below?',
    ],
    suggestedSearchQueries: ['padma bridge engineering challenges deep pile foundation scour', 'padma multipurpose bridge civil engineering breakthroughs'],
  },
  {
    id: 'bd-rmg-economic-transformation',
    topic: 'How Bangladesh became a global Readymade Garment (RMG) powerhouse',
    category: 'Bangladesh',
    difficulty: 'medium',
    description: 'From Desh Garments and Daewoo collaboration in 1979 to the world’s 2nd largest apparel exporter and green factories.',
    starterQuestions: [
      'How did the initial technology transfer between Noorul Quader and South Korea’s Daewoo spark the industry in 1979?',
      'What role did the Multi-Fibre Arrangement (MFA) and back-to-back letters of credit (L/C) play in fueling growth?',
      'How has Bangladesh become home to the highest number of LEED-certified platinum green garment factories globally?',
    ],
    suggestedSearchQueries: ['bangladesh rmg industry history daewoo desh garments 1979', 'bangladesh green garment factories leed platinum apparel export'],
  },

  // --- World & Global Wonders ---
  {
    id: 'world-panama-canal-locks',
    topic: 'How do the Gravity-Powered Locks of the Panama Canal work?',
    category: 'World',
    difficulty: 'medium',
    description: 'Raising massive container ships 85 feet above sea level into Gatun Lake using pure water gravity.',
    starterQuestions: [
      'How does gravity alone fill and empty the lock chambers without water pumps?',
      'Why does Lake Gatun supply fresh water to lift vessels across the continental divide?',
      'What are the engineering differences between the original 1914 locks and the 2016 Neo-Panamax expansion?',
    ],
    suggestedSearchQueries: ['how panama canal locks work gravity water principles', 'gatun lake panama canal continental divide elevation'],
  },
  {
    id: 'world-undersea-internet-cables',
    topic: 'How do Subsea Fiber-Optic Cables carry 99% of global internet traffic?',
    category: 'World',
    difficulty: 'medium',
    description: 'Armored undersea glass strands across ocean trenches, optical repeaters, and shark-bite protection.',
    starterQuestions: [
      'How are laser light pulses total-internally reflected through pure silica glass fiber strands on the seabed?',
      'How do optical erbium-doped fiber amplifiers (EDFAs) boost optical signals every 70 kilometers underwater?',
      'How are cable ships equipped with specialized subsea plows to bury cables into the continental shelf?',
    ],
    suggestedSearchQueries: ['how submarine fiber optic cables work global internet', 'undersea internet cables optical repeaters cable laying ships'],
  },
  {
    id: 'world-svalbard-seed-vault',
    topic: 'How does the Svalbard Global Seed Vault safeguard human civilization?',
    category: 'World',
    difficulty: 'easy',
    description: 'The Arctic permafrost doomsday gene bank designed to preserve crop biodiversity against extinction.',
    starterQuestions: [
      'Why was the remote Svalbard archipelago in Norway chosen for tectonic stability and natural permafrost freezing?',
      'How are vacuum-sealed seed samples preserved at -18°C for centuries?',
      'How did Syrian scientists withdraw seed backups during the Aleppo conflict to reconstruct endangered crops?',
    ],
    suggestedSearchQueries: ['svalbard global seed vault doomsday arctic permafrost', 'icarda syria seed withdrawal svalbard gene bank'],
  },
  {
    id: 'world-iss-architecture',
    topic: 'How does the International Space Station generate power and oxygen?',
    category: 'World',
    difficulty: 'medium',
    description: 'Electrolysis of water, solar tracking wings, CO2 scrubbing, and microgravity orbital physics.',
    starterQuestions: [
      'How does the Elektron/OGS life support system use electrolysis to split recycled water into breathable oxygen?',
      'How do massive solar array wings rotate to continuously track the sun while orbiting Earth every 90 minutes?',
      'How do control moment gyroscopes maintain the space station’s orientation without burning rocket propellant?',
    ],
    suggestedSearchQueries: ['how international space station generates oxygen power life support', 'iss environmental control life support system electrolysis'],
  },

  // --- History ---
  {
    id: 'hist-gutenberg-press',
    topic: 'How the Gutenberg Printing Press catalyzed the Modern World',
    category: 'History',
    difficulty: 'easy',
    description: 'Movable metal type, oil-based ink, and the democratization of knowledge and the scientific revolution.',
    starterQuestions: [
      'What were Johannes Gutenberg’s three key inventions (lead-tin-antimony alloy, oil ink, screw press)?',
      'How did shifting from hand-copied manuscripts drop book production costs by over 90%?',
      'How did printing accelerate the Renaissance, Protestant Reformation, and the birth of scientific journals?',
    ],
    suggestedSearchQueries: ['johannes gutenberg printing press invention movable type', 'impact of gutenberg press on scientific revolution and literacy'],
  },
  {
    id: 'hist-library-of-alexandria',
    topic: 'The Rise, Scholarship, and Loss of the Ancient Library of Alexandria',
    category: 'History',
    difficulty: 'medium',
    description: 'Ptolemaic scholarship, scroll requisitioning, Eratosthenes calculating Earth’s circumference, and gradual decline.',
    starterQuestions: [
      'How did Ptolemaic rulers mandate that every ship docking in Alexandria surrender scrolls for transcription?',
      'What major scientific discoveries (like Eratosthenes calculating the Earth’s circumference) occurred there?',
      'Why is the popular myth of a single catastrophic fire historically inaccurate compared to gradual budget and political decay?',
    ],
    suggestedSearchQueries: ['library of alexandria history ptolemy scholarship', 'eratosthenes earth circumference library of alexandria myths'],
  },
  {
    id: 'hist-apollo-guidance-computer',
    topic: 'How the Apollo Guidance Computer landed humans on the Moon in 1969',
    category: 'History',
    difficulty: 'advanced',
    description: 'Margaret Hamilton’s software engineering, rope core memory, priority scheduling, and the 1202 alarm.',
    starterQuestions: [
      'What was handmade "rope core memory" and how was software physically woven by seamstresses?',
      'How did Margaret Hamilton’s asynchronous priority scheduler prevent the Apollo 11 lunar module from crashing during the 1202 alarm?',
      'How did silicon integrated circuits (ICs) pioneer modern computer architecture through the Apollo program?',
    ],
    suggestedSearchQueries: ['apollo guidance computer margaret hamilton priority scheduling', 'rope core memory apollo 11 1202 alarm explained'],
  },

  // --- English & Linguistics ---
  {
    id: 'eng-lingua-franca-history',
    topic: 'How English evolved into the Global Lingua Franca',
    category: 'English',
    difficulty: 'medium',
    description: 'Old English Germanic roots, Norman French conquest of 1066, the Great Vowel Shift, and global trade.',
    starterQuestions: [
      'How did the 1066 Norman Conquest inject thousands of French and Latin words into Anglo-Saxon Germanic speech?',
      'What was the Great Vowel Shift and why does English spelling often differ from modern pronunciation?',
      'How do maritime trade, industrial revolution, and digital communication cement English as an international medium?',
    ],
    suggestedSearchQueries: ['history of english language 1066 norman conquest great vowel shift', 'how english became global lingua franca etymology'],
  },
  {
    id: 'eng-oxford-comma-ambiguity',
    topic: 'The Oxford Comma: Stylistic Debate and Legal Ambiguity',
    category: 'English',
    difficulty: 'easy',
    description: 'Serial commas, rhetorical cadence, famous multimillion-dollar legal disputes, and clarity.',
    starterQuestions: [
      'What is the serial (Oxford) comma before the final coordinating conjunction in a list of three or more items?',
      'How did a missing Oxford comma in Maine’s overtime laws cost a dairy company $5 million in a court lawsuit?',
      'When can using (or omitting) an Oxford comma inadvertently create comical appositive misinterpretations?',
    ],
    suggestedSearchQueries: ['oxford comma legal dispute maine dairy lawsuit', 'oxford comma examples ambiguity grammar guide'],
  },
  {
    id: 'eng-active-vs-passive-voice',
    topic: 'Active vs Passive Voice: Rhetoric, Agency, and Clarity in Writing',
    category: 'English',
    difficulty: 'easy',
    description: 'Subject-agent positioning, the "zombie test", scientific register conventions, and persuasive prose.',
    starterQuestions: [
      'What is the grammatical formula for passive voice (form of "to be" + past participle + optional "by" agent)?',
      'What is the fun "by zombies" test for detecting hidden passive constructions?',
      'When is passive voice strategically justified (e.g. emphasizing the recipient or in scientific methods)?',
    ],
    suggestedSearchQueries: ['active vs passive voice zombie test examples', 'when to use passive voice in writing and scientific papers'],
  },

  // --- Career & Professional Skills ---
  {
    id: 'car-star-interview-method',
    topic: 'Mastering the STAR Method for Behavioral Interviews',
    category: 'Career',
    difficulty: 'easy',
    description: 'Situation, Task, Action, Result: structuring concise, high-impact competence narratives.',
    starterQuestions: [
      'What are the four components of Situation, Task, Action, and Result?',
      'Why do interviewers look for individual contribution ("I did...") rather than team ambiguity ("We did...") in the Action stage?',
      'How does quantifying outcomes with concrete metrics make the Result stage unforgettable?',
    ],
    suggestedSearchQueries: ['STAR interview method examples situation task action result', 'how to answer behavioral interview questions STAR technique'],
  },
  {
    id: 'car-managing-up',
    topic: 'The Art of Managing Up: Aligning with Leaders & Proactive Communication',
    category: 'Career',
    difficulty: 'medium',
    description: 'Anticipating executive needs, adapting communication styles, and presenting solutions instead of problems.',
    starterQuestions: [
      'What does "managing up" mean in a modern organizational hierarchy?',
      'How does understanding your manager’s core metrics, pressure points, and communication preferences build trust?',
      'What is the "solution-oriented proposal" framework (Problem, Context, Options, Recommendation)?',
    ],
    suggestedSearchQueries: ['how to manage up effectively communication framework', 'managing up workplace strategies trust and alignment'],
  },

  // --- Everyday Life & Practical Science ---
  {
    id: 'life-how-microwaves-heat',
    topic: 'How do Microwave Ovens heat food using Dielectric Heating?',
    category: 'Everyday Life',
    difficulty: 'easy',
    description: 'Magnetrons, 2.45 GHz electromagnetic waves, water dipole rotation, and heat transfer.',
    starterQuestions: [
      'Why are water, fat, and sugar molecules electric dipoles with positive and negative ends?',
      'How does an alternating 2.45 GHz electric field flip water molecules billions of times per second to generate friction heat?',
      'Why do microwaves pass through glass and ceramics but reflect off metals and heat food unevenly without a turntable?',
    ],
    suggestedSearchQueries: ['how microwave ovens work dielectric heating water dipole', 'magnetron 2.45 ghz microwave physics explained'],
  },
  {
    id: 'life-noise-cancelling-headphones',
    topic: 'How do Active Noise-Cancelling (ANC) Headphones cancel sound?',
    category: 'Everyday Life',
    difficulty: 'easy',
    description: 'Microphone phase inversion, destructive acoustic wave interference, and ambient frequency attenuation.',
    starterQuestions: [
      'What is the principle of destructive wave interference (adding an exact 180-degree inverted anti-phase wave)?',
      'How do feedforward and feedback microphones measure external decibels and ear canal acoustic reflections?',
      'Why is ANC exceptionally effective at canceling continuous low-frequency hums (engines) but harder for sudden speech?',
    ],
    suggestedSearchQueries: ['how active noise cancelling works destructive interference anti phase', 'anc headphones feedforward feedback microphone physics'],
  },
  {
    id: 'life-refrigerators-heat-pumps',
    topic: 'How do Refrigerators and Heat Pumps move heat backwards?',
    category: 'Everyday Life',
    difficulty: 'medium',
    description: 'Thermodynamic refrigeration cycles, phase change refrigerants, compressors, and expansion valves.',
    starterQuestions: [
      'Why does liquid evaporating into a gas absorb heat, while gas condensing into liquid releases heat?',
      'What are the four components of the vapor-compression cycle (Compressor, Condenser, Expansion Valve, Evaporator)?',
      'Why are modern heat pumps 300–400% efficient compared to standard electric resistance heating?',
    ],
    suggestedSearchQueries: ['how refrigerators work vapor compression cycle explained', 'how heat pumps move heat phase change refrigerant physics'],
  },
];

/**
 * Filter topics by category and difficulty
 */
export function getFilteredTopics(options: {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'advanced' | 'mixed';
  excludeIds?: string[];
}): CuratedTopic[] {
  const { category, difficulty, excludeIds = [] } = options;

  let pool = CURATED_TOPICS.filter((t) => !excludeIds.includes(t.id));

  // Category filter (if not "Surprise Me")
  if (category && category !== 'Surprise Me') {
    pool = pool.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }

  // Difficulty filter (if not "mixed")
  if (difficulty && difficulty !== 'mixed') {
    pool = pool.filter((t) => t.difficulty === difficulty);
  }

  // Fallback to full pool if filtered out completely
  if (pool.length === 0) {
    if (category && category !== 'Surprise Me') {
      pool = CURATED_TOPICS.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    } else {
      pool = CURATED_TOPICS;
    }
  }

  return pool;
}

/**
 * Pick a random topic respecting category, difficulty, and exclusion history
 */
export function getRandomTopic(options?: {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'advanced' | 'mixed';
  excludeIds?: string[];
}): CuratedTopic {
  const pool = getFilteredTopics(options || {});
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] || CURATED_TOPICS[0];
}

/**
 * Get a deterministic daily curiosity topic based on current date
 */
export function getDailyCuriosityTopic(dateStr?: string): CuratedTopic {
  const today = dateStr || new Date().toISOString().split('T')[0];
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash << 5) - hash + today.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CURATED_TOPICS.length;
  return CURATED_TOPICS[index];
}
