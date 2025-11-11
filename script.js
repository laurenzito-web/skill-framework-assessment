// Application State
let occupations = [];
let selectedOccupation = null;
let selectedSkills = []; // Store skills for competencies display
let representativeCompetencies = []; // Store representative competencies
let questions = [];
let categories = [];
let currentQuestionIndex = 0;
let answers = {};
let categoryScores = {};

// Batch-based assessment state
let questionBatches = []; // Array of batches, each containing 5 questions
let currentBatchIndex = 0;
let currentBatchQuestionIndex = 0;
let batchAnswers = {}; // Answers for current batch

// O*NET API Configuration
// Note: O*NET API requires registration at https://services.onetcenter.org/
// For production, you may need a proxy server to handle CORS
const ONET_API_BASE = 'https://services.onetcenter.org/ws/online/';
const ONET_API_VERSION = 'v1.9';

// AI Configuration
// Set to true to enable AI-based response evaluation
// Requires OpenAI API key to be set (see evaluateOpenEndedResponse function)
const AI_EVALUATION_ENABLED = false; // Set to true to enable AI evaluation
// Set to true to enable AI-based question generation when sections need more questions
const AI_QUESTION_GENERATION_ENABLED = true; // Set to true to enable AI question generation
// API key is loaded from config.local.js (if it exists) or can be set here
// Check for local config first, then fallback to empty string
const OPENAI_API_KEY = (typeof LOCAL_OPENAI_API_KEY !== 'undefined' && LOCAL_OPENAI_API_KEY) 
    ? LOCAL_OPENAI_API_KEY 
    : ''; // Add your OpenAI API key here, or use config.local.js (recommended)

// Debug: Log API key status (first 10 chars only for security)
if (OPENAI_API_KEY) {
    console.log('✅ OpenAI API key loaded:', OPENAI_API_KEY.substring(0, 10) + '...');
    console.log('✅ AI Question Generation:', AI_QUESTION_GENERATION_ENABLED ? 'ENABLED' : 'DISABLED');
    console.log('✅ AI Evaluation:', AI_EVALUATION_ENABLED ? 'ENABLED' : 'DISABLED');
} else {
    console.warn('⚠️ OpenAI API key not found. Check config.local.js or set OPENAI_API_KEY in script.js');
}

const OPENAI_MODEL = 'gpt-4o-mini'; // Use 'gpt-4o-mini' for cost-effective evaluation or 'gpt-4' for more accurate

// DOM Elements
const welcomeScreen = document.getElementById('welcome-screen');
const roleSelectionScreen = document.getElementById('role-selection-screen');
const competenciesScreen = document.getElementById('competencies-screen');
const batchIntroScreen = document.getElementById('batch-intro-screen');
const assessmentScreen = document.getElementById('assessment-screen');
const batchFeedbackScreen = document.getElementById('batch-feedback-screen');
const resultsScreen = document.getElementById('results-screen');

// Verify competencies screen exists
if (!competenciesScreen) {
    console.error('ERROR: competencies-screen element not found in DOM!');
}
const startBtn = document.getElementById('start-btn');
const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
const backToRolesBtn = document.getElementById('back-to-roles-btn');
const startAssessmentBtn = document.getElementById('start-assessment-btn');
const viewRubricsBtn = document.getElementById('view-rubrics-btn');
const rubricsModal = document.getElementById('rubrics-modal');
const closeRubricsBtn = document.getElementById('close-rubrics-btn');
const rubricsContent = document.getElementById('rubrics-content');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');
const questionContainer = document.getElementById('question-container');
const progressFill = document.getElementById('progress-fill');
const questionNumber = document.getElementById('question-number');
const totalQuestions = document.getElementById('total-questions');
const roleList = document.getElementById('role-list');
const roleSearch = document.getElementById('role-search');
const selectedRoleName = document.getElementById('selected-role-name');
const loadingRoles = document.getElementById('loading-roles');
const roleError = document.getElementById('role-error');
const searchOnetBtn = document.getElementById('search-onet-btn');
const searchResults = document.getElementById('search-results');
const searchResultsList = document.getElementById('search-results-list');
const competenciesList = document.getElementById('competencies-list');
const competenciesRoleTitle = document.getElementById('competencies-role-title');
const batchIntroTitle = document.getElementById('batch-intro-title');
const batchCompetenciesList = document.getElementById('batch-competencies-list');
const startBatchBtn = document.getElementById('start-batch-btn');
const currentBatchNumber = document.getElementById('current-batch-number');
const totalBatches = document.getElementById('total-batches');
const questionsInBatch = document.getElementById('questions-in-batch');
const submitBatchBtn = document.getElementById('submit-batch-btn');
const nextBatchBtn = document.getElementById('next-batch-btn');
const viewFinalResultsBtn = document.getElementById('view-final-results-btn');
const batchFeedbackSummary = document.getElementById('batch-feedback-summary');

// Initialize
loadOccupations();

// Event Listeners
startBtn.addEventListener('click', () => {
    welcomeScreen.classList.remove('active');
    roleSelectionScreen.classList.add('active');
});

backToWelcomeBtn.addEventListener('click', () => {
    roleSelectionScreen.classList.remove('active');
    welcomeScreen.classList.add('active');
});

backToRolesBtn.addEventListener('click', () => {
    competenciesScreen.classList.remove('active');
    roleSelectionScreen.classList.add('active');
});

startAssessmentBtn.addEventListener('click', async () => {
    console.log('Start Assessment button clicked');
    console.log('Questions available:', questions.length);
    
    if (!questions || questions.length === 0) {
        alert('Error: No questions available. Please go back and select a role again.');
        return;
    }
    
    competenciesScreen.classList.remove('active');
    await organizeQuestionsIntoBatches();
    
    if (questionBatches.length === 0) {
        alert('Error: Could not organize questions. Please try again.');
        competenciesScreen.classList.add('active');
        return;
    }
    
    showBatchIntro(0);
});

if (startBatchBtn) {
    startBatchBtn.addEventListener('click', () => {
        batchIntroScreen.classList.remove('active');
        assessmentScreen.classList.add('active');
        startBatchQuestions(currentBatchIndex);
    });
} else {
    console.error('startBatchBtn element not found in DOM');
}

if (submitBatchBtn) {
    submitBatchBtn.addEventListener('click', () => {
        showBatchFeedback();
    });
} else {
    console.error('submitBatchBtn element not found in DOM');
}

if (nextBatchBtn) {
    nextBatchBtn.addEventListener('click', () => {
    if (currentBatchIndex < questionBatches.length - 1) {
        // Hide feedback screen and clear its content
        batchFeedbackScreen.classList.remove('active');
        batchFeedbackSummary.innerHTML = '';
        currentBatchIndex++;
        showBatchIntro(currentBatchIndex);
    } else {
        // All batches complete, show final results
        calculateScores();
        batchFeedbackScreen.classList.remove('active');
        batchFeedbackSummary.innerHTML = '';
        resultsScreen.classList.add('active');
        displayResults();
    }
    });
} else {
    console.error('nextBatchBtn element not found in DOM');
}

if (viewFinalResultsBtn) {
    viewFinalResultsBtn.addEventListener('click', () => {
        calculateScores();
        batchFeedbackScreen.classList.remove('active');
        batchFeedbackSummary.innerHTML = '';
        resultsScreen.classList.add('active');
        displayResults();
    });
} else {
    console.error('viewFinalResultsBtn element not found in DOM');
}

roleSearch.addEventListener('input', filterRoles);
roleSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchONETOccupations();
    }
});
searchOnetBtn.addEventListener('click', searchONETOccupations);

// Navigation handlers - Previous/Next buttons are hidden when showing all questions at once
// These handlers are kept for compatibility but won't be used in the new all-questions-on-one-page flow
prevBtn.addEventListener('click', () => {
    if (assessmentScreen.classList.contains('active')) {
        // Not used when all questions are on one page
        showPreviousBatchQuestion();
    }
});

nextBtn.addEventListener('click', () => {
    if (assessmentScreen.classList.contains('active')) {
        // Not used when all questions are on one page
        showNextBatchQuestion();
    }
});

if (submitBtn) {
    submitBtn.addEventListener('click', submitAssessment);
} else {
    console.warn('submitBtn element not found (may have been replaced with submit-batch-btn)');
}

if (restartBtn) {
    restartBtn.addEventListener('click', restartAssessment);
} else {
    console.error('restartBtn element not found in DOM');
}

// Load occupations from local file
async function loadOccupations() {
    try {
        const response = await fetch('occupations.json');
        if (!response.ok) {
            throw new Error('Failed to load occupations.json');
        }
        occupations = await response.json();
        displayRoles(occupations);
    } catch (error) {
        console.error('Error loading occupations:', error);
        roleError.style.display = 'block';
        // Use fallback occupations
        occupations = getFallbackOccupations();
        displayRoles(occupations);
    }
}

// Fallback occupations if JSON file fails
function getFallbackOccupations() {
    return [
        { code: "15-1132.00", title: "Software Developers, Applications", onet_soc_code: "15-1132.00" },
        { code: "15-1131.00", title: "Computer Programmers", onet_soc_code: "15-1131.00" },
        { code: "15-1121.00", title: "Computer Systems Analysts", onet_soc_code: "15-1121.00" },
        { code: "11-3021.00", title: "Computer and Information Systems Managers", onet_soc_code: "11-3021.00" }
    ];
}

// Display roles in the role selection screen
function displayRoles(roles) {
    roleList.innerHTML = '';
    roles.forEach(occupation => {
        const roleItem = document.createElement('div');
        roleItem.className = 'role-item';
        roleItem.innerHTML = `
            <h4>${occupation.title}</h4>
            <p>O*NET Code: ${occupation.code}</p>
        `;
        roleItem.addEventListener('click', (e) => {
            console.log('Role item clicked:', occupation.title);
            e.stopPropagation();
            // Remove selected class from all items
            document.querySelectorAll('.role-item').forEach(item => {
                item.classList.remove('selected');
            });
            // Add selected class to clicked item
            e.currentTarget.classList.add('selected');
            selectRole(occupation);
        });
        roleList.appendChild(roleItem);
    });
}

// Filter roles based on search input (local list only)
function filterRoles() {
    const searchTerm = roleSearch.value.toLowerCase();
    if (searchTerm === '') {
        displayRoles(occupations);
        return;
    }
    const filtered = occupations.filter(occ => 
        occ.title.toLowerCase().includes(searchTerm) ||
        occ.code.toLowerCase().includes(searchTerm)
    );
    displayRoles(filtered);
}

// Search O*NET API for occupations
async function searchONETOccupations() {
    const searchTerm = roleSearch.value.trim();
    
    if (!searchTerm) {
        alert('Please enter a job title to search');
        return;
    }
    
    // Show loading state
    loadingRoles.style.display = 'block';
    roleError.style.display = 'none';
    searchResults.style.display = 'none';
    
    try {
        // Try to search O*NET API
        // O*NET API endpoint for keyword search
        // Format: https://services.onetcenter.org/ws/online/search?keyword={term}
        const searchUrl = `${ONET_API_BASE}search?keyword=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`O*NET API returned ${response.status}`);
        }
        
        const data = await response.json();
        const foundOccupations = parseONETSearchResults(data, searchTerm);
        
        if (foundOccupations.length === 0) {
            throw new Error('No occupations found matching your search');
        }
        
        // Display search results
        displaySearchResults(foundOccupations);
        loadingRoles.style.display = 'none';
        searchResults.style.display = 'block';
        
    } catch (error) {
        console.error('Error searching O*NET:', error);
        loadingRoles.style.display = 'none';
        
        // Try alternative search method or use fallback
        try {
            const fallbackResults = await searchONETFallback(searchTerm);
            if (fallbackResults.length > 0) {
                displaySearchResults(fallbackResults);
                searchResults.style.display = 'block';
            } else {
                roleError.style.display = 'block';
                roleError.innerHTML = `
                    <p>Unable to search O*NET API directly.</p>
                    <p style="font-size: 0.9em;">Error: ${error.message}</p>
                    <p style="font-size: 0.9em; margin-top: 10px;">
                        <strong>Note:</strong> O*NET API may require a proxy server due to CORS restrictions.
                        You can still browse the occupations list below, or try searching with a different term.
                    </p>
                `;
            }
        } catch (fallbackError) {
            roleError.style.display = 'block';
            roleError.innerHTML = `
                <p>Unable to search O*NET API.</p>
                <p style="font-size: 0.9em;">Error: ${error.message}</p>
                <p style="font-size: 0.9em; margin-top: 10px;">
                    Please browse the occupations list below or try again later.
                </p>
            `;
        }
    }
}

// Parse O*NET search results
function parseONETSearchResults(data, searchTerm) {
    const occupations = [];
    
    // O*NET API response structure may vary
    // Adjust based on actual API response format
    if (data.occupation) {
        // Single occupation result
        if (Array.isArray(data.occupation)) {
            data.occupation.forEach(occ => {
                occupations.push({
                    code: occ.code || occ.onetsoc_code,
                    title: occ.title || occ.occupation_title,
                    onet_soc_code: occ.code || occ.onetsoc_code
                });
            });
        } else {
            occupations.push({
                code: data.occupation.code || data.occupation.onetsoc_code,
                title: data.occupation.title || data.occupation.occupation_title,
                onet_soc_code: data.occupation.code || data.occupation.onetsoc_code
            });
        }
    } else if (data.occupations) {
        data.occupations.forEach(occ => {
            occupations.push({
                code: occ.code || occ.onetsoc_code,
                title: occ.title || occ.occupation_title,
                onet_soc_code: occ.code || occ.onetsoc_code
            });
        });
    } else if (Array.isArray(data)) {
        data.forEach(occ => {
            occupations.push({
                code: occ.code || occ.onetsoc_code,
                title: occ.title || occ.occupation_title,
                onet_soc_code: occ.code || occ.onetsoc_code
            });
        });
    }
    
    return occupations;
}

// Fallback search using local data and fuzzy matching
async function searchONETFallback(searchTerm) {
    const term = searchTerm.toLowerCase();
    const results = [];
    
    // Search in local occupations
    occupations.forEach(occ => {
        if (occ.title.toLowerCase().includes(term)) {
            results.push(occ);
        }
    });
    
    // Also try to find similar occupations from a broader list
    // Nursing and healthcare occupations only
    const commonOccupations = [
        // Healthcare/Nursing
        { code: "29-1141.00", title: "Registered Nurses", onet_soc_code: "29-1141.00" },
        { code: "29-1171.00", title: "Nurse Practitioners", onet_soc_code: "29-1171.00" },
        { code: "29-2061.00", title: "Licensed Practical and Licensed Vocational Nurses", onet_soc_code: "29-2061.00" },
        { code: "29-1122.00", title: "Physical Therapists", onet_soc_code: "29-1122.00" },
        { code: "29-1061.00", title: "Anesthesiologists", onet_soc_code: "29-1061.00" },
        { code: "29-1126.00", title: "Respiratory Therapists", onet_soc_code: "29-1126.00" },
        { code: "29-2051.00", title: "Dietetic Technicians", onet_soc_code: "29-2051.00" },
        { code: "11-9111.00", title: "Medical and Health Services Managers", onet_soc_code: "11-9111.00" }
    ];
    
    commonOccupations.forEach(occ => {
        if (occ.title.toLowerCase().includes(term) && !results.find(r => r.code === occ.code)) {
            results.push(occ);
        }
    });
    
    return results;
}

// Display search results
function displaySearchResults(results) {
    searchResultsList.innerHTML = '';
    results.forEach(occupation => {
        const roleItem = document.createElement('div');
        roleItem.className = 'role-item';
        roleItem.innerHTML = `
            <h4>${occupation.title}</h4>
            <p>O*NET Code: ${occupation.code}</p>
        `;
        roleItem.addEventListener('click', (e) => {
            console.log('Search result role item clicked:', occupation.title);
            e.stopPropagation();
            document.querySelectorAll('.role-item').forEach(item => {
                item.classList.remove('selected');
            });
            e.currentTarget.classList.add('selected');
            selectRole(occupation);
        });
        searchResultsList.appendChild(roleItem);
    });
}

// Select a role and fetch skills from O*NET
async function selectRole(occupation) {
    console.log('selectRole called with:', occupation);
    
    if (!occupation || !occupation.onet_soc_code) {
        console.error('Invalid occupation object:', occupation);
        alert('Error: Invalid role selected. Please try again.');
        return;
    }
    
    selectedOccupation = occupation;
    
    // Show loading state
    loadingRoles.style.display = 'block';
    roleError.style.display = 'none';
    console.log('Showing loading state...');
    
    try {
        // Fetch skills from O*NET API
        // Store occupation temporarily for use in parseONETSkills
        const tempOccupation = occupation;
        const onetSkills = await fetchONETSkills(occupation.onet_soc_code, tempOccupation);
        
        // Get skills from credentialing platforms
        let credentialingSkills = [];
        try {
            credentialingSkills = getCredentialingSkills(occupation);
        } catch (error) {
            console.error('Error getting credentialing skills:', error);
            credentialingSkills = [];
        }
        
        // Merge O*NET and credentialing skills
        const skillMap = new Map();
        
        // Add O*NET skills
        onetSkills.forEach(skill => {
            skillMap.set(skill.name.toLowerCase(), skill);
        });
        
        // Merge credentialing skills
        credentialingSkills.forEach(skill => {
            const key = skill.name.toLowerCase();
            if (skillMap.has(key)) {
                // Merge sources
                const existing = skillMap.get(key);
                if (!existing.sources) existing.sources = ['O*NET'];
                existing.sources = [...new Set([...existing.sources, ...skill.sources])];
                // Use higher importance
                if (skill.importance > existing.importance) {
                    existing.importance = skill.importance;
                }
            } else {
                skillMap.set(key, skill);
            }
        });
        
        const skills = Array.from(skillMap.values());
        
        // Store skills for competencies display
        selectedSkills = skills;
        
        // Generate questions from skills
        questions = generateQuestionsFromSkills(skills, occupation);
        
        // Extract categories
        categories = [...new Set(questions.map(q => q.category))];
        categoryScores = {};
        categories.forEach(category => {
            categoryScores[category] = [];
        });
        
        // Update UI
        if (totalQuestions) {
            totalQuestions.textContent = questions.length;
        }
        selectedRoleName.textContent = `Assessing: ${occupation.title}`;
        
        // Show competencies screen instead of going directly to assessment
        loadingRoles.style.display = 'none';
        roleSelectionScreen.classList.remove('active');
        assessmentScreen.classList.remove('active'); // Ensure assessment screen is hidden
        console.log('Displaying competencies screen with', skills.length, 'skills');
        displayCompetencies(skills, occupation);
        competenciesScreen.classList.add('active');
        console.log('Competencies screen should now be visible');
        
        // Double-check that assessment screen is not active
        if (assessmentScreen.classList.contains('active')) {
            console.warn('WARNING: Assessment screen is still active! Removing it.');
            assessmentScreen.classList.remove('active');
        }
        
    } catch (error) {
        console.error('Error fetching O*NET data:', error);
        loadingRoles.style.display = 'none';
        roleError.style.display = 'block';
        roleError.innerHTML = `
            <p>Unable to fetch skills from O*NET API.</p>
            <p style="font-size: 0.9em;">Error: ${error.message}</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Using default skills for this role.</p>
        `;
        
        // Use fallback skills immediately (don't wait 2 seconds)
        const fallbackSkills = getFallbackSkills(occupation);
        selectedSkills = fallbackSkills;
        questions = generateFallbackQuestions(occupation);
        
        console.log('Generated fallback questions:', questions.length);
        
        if (!questions || questions.length === 0) {
            roleError.innerHTML = `
                <p>Error: Could not generate questions for this role.</p>
                <p style="font-size: 0.9em;">Please try selecting a different role.</p>
            `;
            return;
        }
        
        categories = [...new Set(questions.map(q => q.category))];
        categoryScores = {};
        categories.forEach(category => {
            categoryScores[category] = [];
        });
        
        if (totalQuestions) {
            totalQuestions.textContent = questions.length;
        }
        selectedRoleName.textContent = `Assessing: ${occupation.title}`;
        
        // Show competencies screen with fallback immediately
        roleSelectionScreen.classList.remove('active');
        assessmentScreen.classList.remove('active');
        batchIntroScreen.classList.remove('active');
        batchFeedbackScreen.classList.remove('active');
        roleError.style.display = 'none';
        
        console.log('Displaying competencies screen with fallback skills:', fallbackSkills.length);
        displayCompetencies(fallbackSkills, occupation);
        competenciesScreen.classList.add('active');
        console.log('Competencies screen should now be visible (fallback)');
        
        // Double-check that other screens are not active
        if (assessmentScreen.classList.contains('active')) {
            console.warn('WARNING: Assessment screen is still active! Removing it.');
            assessmentScreen.classList.remove('active');
        }
    }
}

// Generate representative competencies that summarize skills across sources
function generateRepresentativeCompetencies(skills) {
    // Define competency groupings that summarize related skills
    // Using a consistent order for categories
    const competencyGroups = {
        'Patient Care & Assessment': [
            {
                name: 'Comprehensive Patient Assessment and Monitoring',
                keywords: ['assessment', 'monitoring', 'observation', 'evaluation', 'vital signs', 'physical assessment', 'health promotion'],
                description: 'Conducting thorough patient assessments, monitoring patient conditions, and evaluating responses to care across physical, psychological, and social dimensions.'
            },
            {
                name: 'Clinical Intervention and Care Delivery',
                keywords: ['intervention', 'treatment', 'care delivery', 'nursing care', 'therapeutic', 'physiological integrity', 'pharmacological'],
                description: 'Implementing evidence-based nursing interventions, administering treatments and medications safely, and managing patient care across the continuum.'
            },
            {
                name: 'Patient Safety and Risk Management',
                keywords: ['safety', 'risk', 'infection control', 'prevention', 'reduction of risk', 'quality', 'error prevention'],
                description: 'Identifying and mitigating patient safety risks, implementing infection control measures, and preventing adverse events through systematic safety practices.'
            }
        ],
        'Clinical Decision Making': [
            {
                name: 'Critical Thinking and Clinical Reasoning',
                keywords: ['critical thinking', 'judgment', 'decision making', 'problem solving', 'analysis', 'reasoning', 'clinical inquiry'],
                description: 'Applying critical thinking skills to analyze patient situations, make sound clinical judgments, and solve complex healthcare problems using evidence-based approaches.'
            },
            {
                name: 'Evidence-Based Practice and Quality Improvement',
                keywords: ['evidence-based', 'quality', 'improvement', 'research', 'best practices', 'outcomes', 'effectiveness'],
                description: 'Integrating research evidence, clinical expertise, and patient preferences into practice decisions and participating in quality improvement initiatives.'
            },
            {
                name: 'Care Coordination and Management',
                keywords: ['coordination', 'management', 'planning', 'prioritization', 'organization', 'care management', 'case management'],
                description: 'Coordinating patient care across settings and providers, managing complex care plans, and prioritizing interventions based on patient acuity and needs.'
            }
        ],
        'Communication & Collaboration': [
            {
                name: 'Therapeutic Communication and Patient Education',
                keywords: ['communication', 'listening', 'speaking', 'teaching', 'education', 'patient education', 'facilitation of learning', 'therapeutic communication'],
                description: 'Engaging in effective therapeutic communication with patients and families, providing health education, and facilitating learning to promote health and wellness.'
            },
            {
                name: 'Interprofessional Collaboration and Teamwork',
                keywords: ['collaboration', 'teamwork', 'coordination', 'interprofessional', 'multidisciplinary', 'cooperation', 'partnership'],
                description: 'Working effectively with healthcare team members from various disciplines, coordinating care, and contributing to collaborative decision-making processes.'
            },
            {
                name: 'Documentation and Professional Communication',
                keywords: ['documentation', 'writing', 'reporting', 'handoff', 'communication', 'record keeping', 'information management'],
                description: 'Maintaining accurate, timely, and comprehensive patient records and communicating effectively through written and verbal channels with team members.'
            }
        ],
        'Patient Safety & Quality': [
            {
                name: 'Safety Protocols and Error Prevention',
                keywords: ['safety', 'error prevention', 'medication safety', 'infection control', 'prevention', 'risk reduction'],
                description: 'Implementing safety protocols, preventing medication errors, maintaining infection control standards, and reducing risks to patient safety.'
            },
            {
                name: 'Quality Assurance and Improvement',
                keywords: ['quality', 'improvement', 'assurance', 'standards', 'outcomes', 'effectiveness', 'excellence'],
                description: 'Participating in quality improvement activities, monitoring care outcomes, and contributing to initiatives that enhance patient care quality.'
            }
        ],
        'Professional Practice': [
            {
                name: 'Professional Development and Lifelong Learning',
                keywords: ['learning', 'development', 'education', 'continuing education', 'professional growth', 'competency', 'knowledge'],
                description: 'Engaging in continuous professional development, staying current with evidence-based practice, and maintaining professional competencies.'
            },
            {
                name: 'Ethical Practice and Professional Accountability',
                keywords: ['ethics', 'accountability', 'responsibility', 'professionalism', 'integrity', 'advocacy', 'values'],
                description: 'Practicing with ethical integrity, maintaining professional accountability, advocating for patients, and upholding professional standards and values.'
            }
        ]
    };
    
    // Sort skills deterministically by name first to ensure consistent processing
    const sortedSkills = [...skills].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    // Group skills by category (maintaining sorted order within categories)
    const skillsByCategory = {};
    sortedSkills.forEach(skill => {
        const category = skill.category || 'General Skills';
        if (!skillsByCategory[category]) {
            skillsByCategory[category] = [];
        }
        skillsByCategory[category].push(skill);
    });
    
    const representativeCompetencies = [];
    
    // Define consistent category order for processing
    const categoryOrder = [
        'Patient Care & Assessment',
        'Clinical Decision Making',
        'Communication & Collaboration',
        'Patient Safety & Quality',
        'Professional Practice'
    ];
    
    // Process categories in consistent order
    categoryOrder.forEach(category => {
        if (!competencyGroups[category] || !skillsByCategory[category] || skillsByCategory[category].length === 0) {
            return;
        }
        
        const categorySkills = skillsByCategory[category];
        const groups = competencyGroups[category];
        
        // Process groups in their defined order
        groups.forEach(group => {
            // Find skills that match this competency group
            const matchingSkills = categorySkills.filter(skill => {
                const skillNameLower = skill.name.toLowerCase();
                return group.keywords.some(keyword => skillNameLower.includes(keyword.toLowerCase()));
            });
            
            if (matchingSkills.length > 0) {
                // Sort matching skills deterministically by name for consistent representativeSkills
                const sortedMatchingSkills = [...matchingSkills].sort((a, b) => {
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                
                // Calculate average importance
                const avgImportance = sortedMatchingSkills.reduce((sum, s) => sum + (s.importance || 0), 0) / sortedMatchingSkills.length;
                
                // Collect all unique sources and sort them
                const allSources = new Set();
                sortedMatchingSkills.forEach(skill => {
                    if (skill.sources) {
                        skill.sources.forEach(source => allSources.add(source));
                    }
                });
                const sortedSources = Array.from(allSources).sort();
                
                representativeCompetencies.push({
                    name: group.name,
                    category: category,
                    description: group.description,
                    importance: Math.round(avgImportance * 10) / 10, // Round to 1 decimal
                    sources: sortedSources,
                    skillCount: sortedMatchingSkills.length,
                    representativeSkills: sortedMatchingSkills.slice(0, 3).map(s => s.name) // Show top 3 representative skills (sorted)
                });
            }
        });
    });
    
    // Sort by importance (highest first), then by category, then by name for complete stability
    return representativeCompetencies.sort((a, b) => {
        // First sort by importance (descending)
        if (b.importance !== a.importance) {
            return b.importance - a.importance;
        }
        // Then by category (alphabetically)
        const categoryA = (a.category || '').toLowerCase();
        const categoryB = (b.category || '').toLowerCase();
        if (categoryA !== categoryB) {
            return categoryA.localeCompare(categoryB);
        }
        // Finally by name (alphabetically)
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

// Display competencies for the selected role
function displayCompetencies(skills, occupation) {
    console.log('displayCompetencies called with', skills?.length || 0, 'skills');
    competenciesRoleTitle.textContent = `Competencies for ${occupation.title}`;
    competenciesList.innerHTML = '';
    
    if (!skills || skills.length === 0) {
        console.warn('No skills provided to displayCompetencies');
        competenciesList.innerHTML = '<p>No competency data available for this role.</p>';
        return;
    }
    
    // Generate representative competencies and store globally
    representativeCompetencies = generateRepresentativeCompetencies(skills);
    
    if (representativeCompetencies.length === 0) {
        competenciesList.innerHTML = '<p>No representative competencies could be generated from the available skills.</p>';
        return;
    }
    
    // Group competencies by category
    const competenciesByCategory = {};
    representativeCompetencies.forEach(competency => {
        const category = competency.category || 'General Skills';
        if (!competenciesByCategory[category]) {
            competenciesByCategory[category] = [];
        }
        competenciesByCategory[category].push(competency);
    });
    
    // Sort categories by highest importance competency, then alphabetically for stability
    const sortedCategories = Object.keys(competenciesByCategory).sort((a, b) => {
        const maxA = Math.max(...competenciesByCategory[a].map(c => c.importance || 0));
        const maxB = Math.max(...competenciesByCategory[b].map(c => c.importance || 0));
        if (maxB !== maxA) {
            return maxB - maxA;
        }
        // If importance is equal, sort alphabetically for consistency
        return a.localeCompare(b);
    });
    
    // Display representative competencies by category
    sortedCategories.forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'competency-category';
        
        const categoryHeader = document.createElement('h3');
        categoryHeader.textContent = category;
        categoryDiv.appendChild(categoryHeader);
        
        const competencyList = document.createElement('ul');
        competencyList.className = 'competency-skills';
        
        // Sort competencies by importance (highest first), then by name for stability
        const categoryCompetencies = competenciesByCategory[category]
            .sort((a, b) => {
                const importanceDiff = (b.importance || 0) - (a.importance || 0);
                if (importanceDiff !== 0) {
                    return importanceDiff;
                }
                // If importance is equal, sort alphabetically by name
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        
        categoryCompetencies.forEach(competency => {
            const competencyItem = document.createElement('li');
            competencyItem.className = 'competency-item';
            
            const competencyNameDiv = document.createElement('div');
            competencyNameDiv.className = 'competency-name-wrapper';
            
            const competencyName = document.createElement('div');
            competencyName.className = 'competency-name';
            competencyName.textContent = competency.name;
            competencyNameDiv.appendChild(competencyName);
            
            // Display sources
            if (competency.sources && competency.sources.length > 0) {
                const sourcesDiv = document.createElement('div');
                sourcesDiv.className = 'competency-sources';
                const sourcesText = competency.sources.length === 1 
                    ? `Source: ${competency.sources[0]}` 
                    : `Sources: ${competency.sources.join(', ')}`;
                sourcesDiv.textContent = sourcesText;
                competencyNameDiv.appendChild(sourcesDiv);
            }
            
            // Display description
            if (competency.description) {
                const competencyDescription = document.createElement('div');
                competencyDescription.className = 'competency-description';
                competencyDescription.textContent = competency.description;
                competencyNameDiv.appendChild(competencyDescription);
            }
            
            // Show representative skills (optional, can be hidden)
            if (competency.representativeSkills && competency.representativeSkills.length > 0) {
                const skillsNote = document.createElement('div');
                skillsNote.className = 'competency-skills-note';
                skillsNote.style.fontSize = '0.85em';
                skillsNote.style.color = '#666';
                skillsNote.style.marginTop = '5px';
                skillsNote.style.fontStyle = 'italic';
                skillsNote.textContent = `Represents ${competency.skillCount} skills including: ${competency.representativeSkills.join(', ')}`;
                competencyNameDiv.appendChild(skillsNote);
            }
            
            competencyItem.appendChild(competencyNameDiv);
            competencyList.appendChild(competencyItem);
        });
        
        categoryDiv.appendChild(competencyList);
        competenciesList.appendChild(categoryDiv);
    });
}

// Generate competency-specific rubric details based on competency context
function getCompetencySpecificRubric(competency) {
    const competencyName = competency.name.toLowerCase();
    const category = competency.category || '';
    
    // Base rubric structure
    const rubric = {
        1: { indicators: [], examples: [], recommendations: [] },
        2: { indicators: [], examples: [], recommendations: [] },
        3: { indicators: [], examples: [], recommendations: [] }
    };
    
    // Patient Care & Assessment competencies
    if (category === 'Patient Care & Assessment') {
        if (competencyName.includes('assessment') || competencyName.includes('monitoring')) {
            rubric[3].indicators = [
                "Performs comprehensive, systematic patient assessments including physical, psychological, and social dimensions",
                "Identifies subtle changes in patient condition and recognizes early warning signs",
                "Uses appropriate assessment techniques and tools for the patient population",
                "Documents assessment findings accurately and comprehensively",
                "Integrates assessment data to form a complete clinical picture"
            ];
            rubric[3].examples = [
                "Conducts thorough head-to-toe assessment, identifies abnormal findings, and documents comprehensively",
                "Recognizes subtle changes in vital signs or behavior that indicate deterioration",
                "Uses validated assessment tools appropriately (e.g., pain scales, fall risk assessments)"
            ];
            rubric[3].recommendations = [
                "Continue refining assessment skills through practice and observation",
                "Stay current with evidence-based assessment tools and techniques",
                "Consider mentoring others in comprehensive assessment practices"
            ];
            
            rubric[2].indicators = [
                "Performs basic assessments but may miss subtle findings or important details",
                "Identifies obvious changes but may not recognize early warning signs",
                "Uses some assessment tools but inconsistently or inappropriately",
                "Documents findings but may lack detail or organization",
                "Shows developing ability to integrate assessment data"
            ];
            rubric[2].examples = [
                "Performs focused assessment but misses comprehensive evaluation of all systems",
                "Identifies major changes but may not notice subtle deterioration",
                "Uses assessment tools but may not interpret results correctly"
            ];
            rubric[2].recommendations = [
                "Practice comprehensive assessment techniques on diverse patient scenarios",
                "Study normal vs. abnormal findings to improve recognition skills",
                "Review documentation standards and practice detailed charting"
            ];
            
            rubric[1].indicators = [
                "Performs incomplete or superficial assessments",
                "Fails to identify significant changes in patient condition",
                "Does not use appropriate assessment tools or techniques",
                "Inadequate or missing documentation of assessment findings",
                "Unable to integrate assessment data meaningfully"
            ];
            rubric[1].examples = [
                "Skips important assessment components or performs assessment incorrectly",
                "Misses obvious signs of patient deterioration",
                "Does not document assessment findings or documents inaccurately"
            ];
            rubric[1].recommendations = [
                "Review fundamental assessment techniques and systematic approaches",
                "Study normal and abnormal assessment findings",
                "Practice assessment skills under supervision",
                "Learn proper documentation of assessment data"
            ];
        } else if (competencyName.includes('intervention') || competencyName.includes('care delivery')) {
            rubric[3].indicators = [
                "Implements evidence-based interventions appropriately and safely",
                "Administers medications and treatments with accuracy and proper technique",
                "Monitors patient response to interventions and adjusts care accordingly",
                "Coordinates multiple interventions effectively and prioritizes appropriately",
                "Demonstrates proficiency in technical skills and procedures"
            ];
            rubric[3].examples = [
                "Safely administers complex medication regimens and monitors for adverse effects",
                "Performs procedures with technical proficiency and patient comfort",
                "Adjusts care plan based on patient response and changing needs"
            ];
            rubric[3].recommendations = [
                "Stay current with evidence-based practice guidelines",
                "Continue developing technical skills and procedural competency",
                "Participate in quality improvement initiatives"
            ];
            
            rubric[2].indicators = [
                "Implements basic interventions but may lack depth or evidence base",
                "Administers treatments safely but may need guidance for complex situations",
                "Monitors patient response but may miss subtle changes",
                "Coordinates some interventions but struggles with prioritization",
                "Shows developing technical skills but needs practice"
            ];
            rubric[2].examples = [
                "Follows protocols correctly but may not adapt to unique patient needs",
                "Performs procedures safely but may lack efficiency or patient comfort",
                "Monitors patient but may not recognize when to adjust interventions"
            ];
            rubric[2].recommendations = [
                "Study evidence-based interventions for common conditions",
                "Practice technical skills and seek feedback",
                "Learn to prioritize interventions based on patient acuity"
            ];
            
            rubric[1].indicators = [
                "Implements interventions incorrectly or unsafely",
                "Administers medications or treatments with errors",
                "Does not monitor patient response to interventions",
                "Unable to coordinate multiple interventions",
                "Lacks basic technical skills or performs procedures incorrectly"
            ];
            rubric[1].examples = [
                "Makes medication errors or uses incorrect techniques",
                "Performs procedures unsafely or causes patient harm",
                "Does not recognize when interventions are ineffective"
            ];
            rubric[1].recommendations = [
                "Review fundamental nursing interventions and procedures",
                "Study medication administration safety protocols",
                "Practice skills under direct supervision",
                "Complete additional training in core clinical skills"
            ];
        } else if (competencyName.includes('safety') || competencyName.includes('risk')) {
            rubric[3].indicators = [
                "Proactively identifies and mitigates patient safety risks",
                "Implements infection control measures consistently and correctly",
                "Prevents medication errors through systematic safety practices",
                "Recognizes and responds to safety hazards immediately",
                "Implements fall prevention and other safety protocols effectively"
            ];
            rubric[3].examples = [
                "Identifies potential medication interactions before administration",
                "Maintains strict infection control practices in all situations",
                "Recognizes environmental hazards and takes immediate corrective action"
            ];
            rubric[3].recommendations = [
                "Stay current with safety protocols and best practices",
                "Participate in safety committees and quality initiatives",
                "Share safety knowledge with colleagues"
            ];
            
            rubric[2].indicators = [
                "Identifies obvious safety risks but may miss subtle concerns",
                "Follows safety protocols but inconsistently",
                "Recognizes some hazards but may not respond appropriately",
                "Shows basic safety awareness but needs improvement"
            ];
            rubric[2].examples = [
                "Follows hand hygiene protocols but may miss some opportunities",
                "Identifies major safety risks but misses subtle warning signs",
                "Recognizes hazards but may not take immediate action"
            ];
            rubric[2].recommendations = [
                "Study safety protocols and error prevention strategies",
                "Practice identifying safety risks in various scenarios",
                "Develop consistent safety habits"
            ];
            
            rubric[1].indicators = [
                "Fails to identify patient safety risks",
                "Does not follow infection control or safety protocols",
                "Makes safety errors or fails to prevent harm",
                "Does not recognize or respond to safety hazards"
            ];
            rubric[1].examples = [
                "Violates infection control practices or medication safety protocols",
                "Does not recognize obvious safety hazards",
                "Makes errors that could cause patient harm"
            ];
            rubric[1].recommendations = [
                "Review fundamental safety protocols and standards",
                "Study error prevention strategies",
                "Complete safety training and practice under supervision"
            ];
        }
    }
    
    // Clinical Decision Making competencies
    else if (category === 'Clinical Decision Making') {
        if (competencyName.includes('critical thinking') || competencyName.includes('reasoning')) {
            rubric[3].indicators = [
                "Analyzes complex patient situations using systematic critical thinking",
                "Identifies patterns and connections between multiple factors",
                "Makes sound clinical judgments based on evidence and analysis",
                "Solves problems creatively and effectively",
                "Applies clinical reasoning to novel situations"
            ];
            rubric[3].examples = [
                "Identifies underlying causes of patient problems by analyzing multiple data points",
                "Makes appropriate clinical decisions in complex, ambiguous situations",
                "Recognizes when standard protocols need to be adapted for unique patient needs"
            ];
            rubric[3].recommendations = [
                "Continue developing analytical skills through case study analysis",
                "Engage in reflective practice and clinical reasoning exercises",
                "Mentor others in critical thinking development"
            ];
            
            rubric[2].indicators = [
                "Shows basic critical thinking but may miss complex connections",
                "Follows protocols but struggles with analysis in novel situations",
                "Makes reasonable judgments but may lack depth of reasoning",
                "Solves straightforward problems but struggles with complexity"
            ];
            rubric[2].examples = [
                "Identifies obvious issues but may miss underlying causes",
                "Follows protocols correctly but may not adapt to unique situations",
                "Makes decisions but may not fully analyze all factors"
            ];
            rubric[2].recommendations = [
                "Practice analyzing complex case scenarios",
                "Study clinical reasoning models and frameworks",
                "Engage in reflective practice and seek feedback on decision-making"
            ];
            
            rubric[1].indicators = [
                "Lacks critical thinking skills or analytical ability",
                "Unable to analyze patient situations meaningfully",
                "Makes poor clinical judgments or decisions",
                "Does not recognize problems or need for intervention"
            ];
            rubric[1].examples = [
                "Does not identify obvious problems or need for action",
                "Makes inappropriate clinical decisions",
                "Unable to analyze even simple patient situations"
            ];
            rubric[1].recommendations = [
                "Study fundamental critical thinking concepts",
                "Practice analyzing simple case scenarios",
                "Seek mentorship and guidance in clinical reasoning",
                "Complete training in clinical decision-making"
            ];
        } else if (competencyName.includes('evidence-based') || competencyName.includes('quality')) {
            rubric[3].indicators = [
                "Integrates current research evidence into practice decisions",
                "Applies evidence-based guidelines appropriately to patient care",
                "Participates actively in quality improvement initiatives",
                "Evaluates outcomes and adjusts practice based on evidence",
                "Contributes to evidence-based practice initiatives"
            ];
            rubric[3].examples = [
                "Uses current research to guide care decisions and explains rationale",
                "Participates in quality improvement projects and implements changes",
                "Evaluates care outcomes and adjusts practice based on results"
            ];
            rubric[3].recommendations = [
                "Stay current with research in your specialty area",
                "Participate in journal clubs and evidence-based practice groups",
                "Lead quality improvement initiatives"
            ];
            
            rubric[2].indicators = [
                "Shows awareness of evidence-based practice but applies inconsistently",
                "Uses some evidence but may rely primarily on experience",
                "Participates in quality initiatives but passively",
                "Shows developing understanding of research application"
            ];
            rubric[2].examples = [
                "Knows about evidence-based guidelines but may not apply consistently",
                "Participates in quality initiatives but may not contribute actively",
                "Uses evidence but may not evaluate its applicability"
            ];
            rubric[2].recommendations = [
                "Study evidence-based practice principles and application",
                "Learn to critically appraise research literature",
                "Actively participate in quality improvement activities"
            ];
            
            rubric[1].indicators = [
                "Does not use evidence-based practice in care decisions",
                "Relies solely on experience without considering evidence",
                "Does not participate in quality improvement",
                "Lacks understanding of research application to practice"
            ];
            rubric[1].examples = [
                "Makes care decisions without considering current evidence",
                "Does not follow evidence-based guidelines",
                "Shows no awareness of quality improvement processes"
            ];
            rubric[1].recommendations = [
                "Study fundamental evidence-based practice concepts",
                "Learn to access and understand research literature",
                "Participate in basic quality improvement training"
            ];
        } else if (competencyName.includes('coordination') || competencyName.includes('management')) {
            rubric[3].indicators = [
                "Coordinates complex care across multiple providers and settings",
                "Prioritizes interventions effectively based on patient acuity",
                "Manages care plans efficiently and adapts to changing needs",
                "Organizes care delivery to maximize efficiency and outcomes",
                "Facilitates smooth transitions of care"
            ];
            rubric[3].examples = [
                "Coordinates care for complex patients with multiple providers seamlessly",
                "Prioritizes interventions appropriately in high-acuity situations",
                "Manages care transitions effectively and prevents gaps in care"
            ];
            rubric[3].recommendations = [
                "Continue developing care coordination skills",
                "Learn advanced care management strategies",
                "Participate in care coordination initiatives"
            ];
            
            rubric[2].indicators = [
                "Coordinates basic care but struggles with complexity",
                "Prioritizes some interventions but may miss important priorities",
                "Manages care plans but may lack efficiency",
                "Shows developing organizational skills"
            ];
            rubric[2].examples = [
                "Coordinates care for straightforward patients but struggles with complex cases",
                "Prioritizes obvious needs but may miss subtle priorities",
                "Manages care but may be inefficient or miss details"
            ];
            rubric[2].recommendations = [
                "Practice prioritizing interventions in various scenarios",
                "Study care coordination models and strategies",
                "Develop organizational and time management skills"
            ];
            
            rubric[1].indicators = [
                "Unable to coordinate care effectively",
                "Does not prioritize interventions appropriately",
                "Manages care plans poorly or ineffectively",
                "Lacks organizational skills"
            ];
            rubric[1].examples = [
                "Fails to coordinate care between providers",
                "Does not prioritize urgent needs appropriately",
                "Manages care ineffectively or causes care gaps"
            ];
            rubric[1].recommendations = [
                "Study fundamental care coordination principles",
                "Learn prioritization frameworks and techniques",
                "Practice organizational skills and care management"
            ];
        }
    }
    
    // Communication & Collaboration competencies
    else if (category === 'Communication & Collaboration') {
        if (competencyName.includes('therapeutic') || competencyName.includes('patient education')) {
            rubric[3].indicators = [
                "Engages in effective therapeutic communication with patients and families",
                "Provides comprehensive, tailored patient education",
                "Uses active listening and empathy appropriately",
                "Adapts communication style to meet patient needs and preferences",
                "Facilitates patient learning and health promotion effectively"
            ];
            rubric[3].examples = [
                "Uses therapeutic communication techniques to build rapport and address concerns",
                "Provides patient education that is comprehensive, understandable, and tailored",
                "Adapts teaching methods to patient learning style and health literacy"
            ];
            rubric[3].recommendations = [
                "Continue developing communication and teaching skills",
                "Stay current with health literacy and patient education best practices",
                "Mentor others in therapeutic communication"
            ];
            
            rubric[2].indicators = [
                "Communicates effectively but may lack therapeutic depth",
                "Provides basic patient education but may lack tailoring",
                "Uses some active listening but inconsistently",
                "Shows developing ability to adapt communication"
            ];
            rubric[2].examples = [
                "Provides standard patient education but may not adapt to individual needs",
                "Communicates clearly but may not use advanced therapeutic techniques",
                "Listens to patients but may miss subtle cues or concerns"
            ];
            rubric[2].recommendations = [
                "Study therapeutic communication techniques",
                "Learn to assess patient learning needs and adapt education",
                "Practice active listening and empathy skills"
            ];
            
            rubric[1].indicators = [
                "Ineffective or inappropriate communication with patients",
                "Does not provide adequate patient education",
                "Lacks active listening or empathy",
                "Does not adapt communication to patient needs"
            ];
            rubric[1].examples = [
                "Uses medical jargon without explanation or adaptation",
                "Does not provide patient education or provides inadequate information",
                "Does not listen to patient concerns or respond appropriately"
            ];
            rubric[1].recommendations = [
                "Study fundamental communication skills",
                "Learn basic patient education principles",
                "Practice active listening and empathy",
                "Complete communication training"
            ];
        } else if (competencyName.includes('interprofessional') || competencyName.includes('teamwork')) {
            rubric[3].indicators = [
                "Collaborates effectively with interdisciplinary team members",
                "Contributes meaningfully to team decision-making",
                "Communicates clearly and professionally with all team members",
                "Resolves conflicts constructively and maintains positive relationships",
                "Facilitates effective team functioning"
            ];
            rubric[3].examples = [
                "Actively participates in interdisciplinary rounds and contributes valuable insights",
                "Resolves team conflicts professionally and maintains collaborative relationships",
                "Coordinates effectively with team members to optimize patient care"
            ];
            rubric[3].recommendations = [
                "Continue developing collaboration and leadership skills",
                "Participate in interprofessional education and practice",
                "Mentor others in teamwork and collaboration"
            ];
            
            rubric[2].indicators = [
                "Collaborates with team but may be passive or reactive",
                "Participates in team decisions but contributes minimally",
                "Communicates with team but may lack clarity or professionalism",
                "Shows developing teamwork skills"
            ];
            rubric[2].examples = [
                "Participates in team meetings but may not contribute proactively",
                "Communicates with team members but may miss important information",
                "Works with team but may not resolve conflicts effectively"
            ];
            rubric[2].recommendations = [
                "Practice active participation in team activities",
                "Develop communication skills for interprofessional settings",
                "Study conflict resolution and teamwork strategies"
            ];
            
            rubric[1].indicators = [
                "Does not collaborate effectively with team members",
                "Does not contribute to team decision-making",
                "Poor communication with team members",
                "Creates or fails to resolve team conflicts"
            ];
            rubric[1].examples = [
                "Does not communicate important information to team members",
                "Creates conflicts or does not work collaboratively",
                "Does not participate in team activities or decision-making"
            ];
            rubric[1].recommendations = [
                "Study fundamental teamwork and collaboration principles",
                "Learn professional communication skills",
                "Practice working in team settings",
                "Complete interprofessional collaboration training"
            ];
        } else if (competencyName.includes('documentation')) {
            rubric[3].indicators = [
                "Documents patient care accurately, comprehensively, and timely",
                "Uses appropriate documentation standards and formats",
                "Documents in a clear, concise, and professional manner",
                "Ensures documentation supports continuity of care",
                "Maintains legal and ethical documentation standards"
            ];
            rubric[3].examples = [
                "Documents all care comprehensively and in real-time",
                "Uses proper medical terminology and documentation formats",
                "Creates documentation that clearly communicates patient status and care"
            ];
            rubric[3].recommendations = [
                "Stay current with documentation standards and requirements",
                "Continue refining documentation skills",
                "Participate in documentation quality initiatives"
            ];
            
            rubric[2].indicators = [
                "Documents care but may lack detail or timeliness",
                "Uses documentation standards but inconsistently",
                "Documents clearly but may miss important information",
                "Shows developing documentation skills"
            ];
            rubric[2].examples = [
                "Documents care but may delay or miss some details",
                "Uses proper formats but may not include all required information",
                "Documents clearly but may lack comprehensiveness"
            ];
            rubric[2].recommendations = [
                "Study documentation standards and requirements",
                "Practice comprehensive and timely documentation",
                "Review documentation examples and seek feedback"
            ];
            
            rubric[1].indicators = [
                "Inadequate, inaccurate, or missing documentation",
                "Does not follow documentation standards",
                "Poor quality documentation that does not support care",
                "Violates documentation requirements or standards"
            ];
            rubric[1].examples = [
                "Fails to document important care or documents inaccurately",
                "Does not use proper documentation formats or standards",
                "Creates documentation that is unclear or unprofessional"
            ];
            rubric[1].recommendations = [
                "Study fundamental documentation principles and standards",
                "Practice basic documentation skills",
                "Complete documentation training",
                "Work under supervision to improve documentation"
            ];
        }
    }
    
    // Professional Practice competencies
    else if (category === 'Professional Practice') {
        if (competencyName.includes('development') || competencyName.includes('learning')) {
            rubric[3].indicators = [
                "Engages actively in continuous professional development",
                "Stays current with evidence-based practice and new knowledge",
                "Seeks learning opportunities and applies new knowledge to practice",
                "Maintains professional competencies and certifications",
                "Contributes to professional development of others"
            ];
            rubric[3].examples = [
                "Regularly participates in continuing education and applies learning to practice",
                "Stays current with research and evidence in specialty area",
                "Mentors others and shares knowledge with colleagues"
            ];
            rubric[3].recommendations = [
                "Continue pursuing advanced education and certifications",
                "Engage in professional organizations and activities",
                "Consider pursuing advanced degrees or specialty certifications"
            ];
            
            rubric[2].indicators = [
                "Participates in some professional development but inconsistently",
                "Shows awareness of need to stay current but may not actively pursue learning",
                "Maintains basic competencies but may not seek advanced knowledge",
                "Shows developing commitment to lifelong learning"
            ];
            rubric[2].examples = [
                "Completes required continuing education but may not seek additional learning",
                "Shows interest in learning but may not apply new knowledge consistently",
                "Maintains basic competencies but may not pursue advanced skills"
            ];
            rubric[2].recommendations = [
                "Develop a professional development plan",
                "Actively seek learning opportunities in your specialty",
                "Join professional organizations and attend conferences"
            ];
            
            rubric[1].indicators = [
                "Does not engage in professional development",
                "Does not stay current with practice standards or evidence",
                "Fails to maintain required competencies or certifications",
                "Shows no commitment to lifelong learning"
            ];
            rubric[1].examples = [
                "Does not complete required continuing education",
                "Shows no interest in learning or professional growth",
                "Fails to maintain basic professional competencies"
            ];
            rubric[1].recommendations = [
                "Develop a plan for professional development",
                "Complete required continuing education and training",
                "Seek mentorship and guidance in professional growth",
                "Join professional organizations"
            ];
        } else if (competencyName.includes('ethical') || competencyName.includes('accountability')) {
            rubric[3].indicators = [
                "Demonstrates strong ethical reasoning and integrity in all situations",
                "Maintains professional accountability and responsibility",
                "Advocates effectively for patients and upholds their rights",
                "Makes ethical decisions based on professional standards and values",
                "Models professional behavior and ethical practice"
            ];
            rubric[3].examples = [
                "Recognizes and addresses ethical dilemmas appropriately",
                "Advocates for patients even when facing resistance",
                "Maintains professional boundaries and ethical standards consistently"
            ];
            rubric[3].recommendations = [
                "Continue studying ethical principles and their application",
                "Participate in ethics committees or consultations",
                "Mentor others in ethical practice"
            ];
            
            rubric[2].indicators = [
                "Shows basic understanding of ethics but may struggle with complex situations",
                "Maintains accountability but may need guidance in difficult cases",
                "Advocates for patients but may lack confidence or effectiveness",
                "Shows developing ethical reasoning skills"
            ];
            rubric[2].examples = [
                "Recognizes ethical issues but may not know how to address them",
                "Maintains basic professional standards but may struggle with dilemmas",
                "Advocates for patients but may not persist when facing challenges"
            ];
            rubric[2].recommendations = [
                "Study ethical principles and decision-making frameworks",
                "Practice analyzing ethical dilemmas and case studies",
                "Seek guidance from ethics committees or mentors"
            ];
            
            rubric[1].indicators = [
                "Lacks understanding of ethical principles or professional accountability",
                "Does not advocate for patients or uphold their rights",
                "Makes unethical decisions or violates professional standards",
                "Does not maintain professional boundaries or accountability"
            ];
            rubric[1].examples = [
                "Does not recognize ethical issues or dilemmas",
                "Violates patient rights or professional standards",
                "Does not maintain professional boundaries or accountability"
            ];
            rubric[1].recommendations = [
                "Study fundamental ethical principles and professional standards",
                "Complete ethics training and education",
                "Seek mentorship in ethical practice",
                "Review professional code of ethics and standards"
            ];
        }
    }
    
    // If no specific rubric found, use general indicators with competency context
    if (rubric[3].indicators.length === 0) {
        // Add competency-specific context to general indicators
        const context = competency.description || competency.name;
        rubric[3].indicators = RUBRIC_LEVELS[3].indicators.map(ind => 
            `${ind} in the context of ${context.toLowerCase()}`
        );
        rubric[2].indicators = RUBRIC_LEVELS[2].indicators.map(ind => 
            `${ind} in the context of ${context.toLowerCase()}`
        );
        rubric[1].indicators = RUBRIC_LEVELS[1].indicators.map(ind => 
            `${ind} in the context of ${context.toLowerCase()}`
        );
    }
    
    return rubric;
}

// Display rubrics for all competencies
function displayRubricsForAllCompetencies() {
    if (!representativeCompetencies || representativeCompetencies.length === 0) {
        rubricsContent.innerHTML = '<p>No competencies available to display rubrics.</p>';
        return;
    }
    
    rubricsContent.innerHTML = '';
    
    // Add general rubric explanation
    const introDiv = document.createElement('div');
    introDiv.className = 'rubrics-intro';
    introDiv.innerHTML = `
        <p><strong>Assessment Rubric Overview</strong></p>
        <p>Your responses to scenario-based questions will be evaluated using a 3-level competency rubric. Each competency has specific indicators, examples, and recommendations tailored to its context.</p>
    `;
    rubricsContent.appendChild(introDiv);
    
    // Display rubric for each competency with detailed, contextual information
    const competenciesSection = document.createElement('div');
    competenciesSection.className = 'competencies-rubrics';
    competenciesSection.innerHTML = '<h3>Competency-Specific Assessment Rubrics</h3>';
    
    // Group competencies by category
    const competenciesByCategory = {};
    representativeCompetencies.forEach(competency => {
        const category = competency.category || 'General Skills';
        if (!competenciesByCategory[category]) {
            competenciesByCategory[category] = [];
        }
        competenciesByCategory[category].push(competency);
    });
    
    Object.keys(competenciesByCategory).forEach(category => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'rubric-category';
        
        const categoryHeader = document.createElement('h4');
        categoryHeader.textContent = category;
        categoryDiv.appendChild(categoryHeader);
        
        competenciesByCategory[category].forEach(competency => {
            const competencyRubricDiv = document.createElement('div');
            competencyRubricDiv.className = 'competency-rubric';
            
            const competencyName = document.createElement('div');
            competencyName.className = 'competency-rubric-name';
            competencyName.textContent = competency.name;
            competencyRubricDiv.appendChild(competencyName);
            
            if (competency.description) {
                const competencyDesc = document.createElement('div');
                competencyDesc.className = 'competency-rubric-description';
                competencyDesc.textContent = competency.description;
                competencyRubricDiv.appendChild(competencyDesc);
            }
            
            // Get competency-specific rubric details
            const competencyRubric = getCompetencySpecificRubric(competency);
            
            // Display detailed rubric levels for this competency
            const rubricLevelsDiv = document.createElement('div');
            rubricLevelsDiv.className = 'competency-rubric-levels-detailed';
            
            // Level 3: Competent
            const level3Div = document.createElement('div');
            level3Div.className = 'competency-rubric-level';
            level3Div.innerHTML = `
                <div class="rubric-level-header-detailed rubric-level-3">
                    <strong>Level 3: Competent</strong>
                </div>
                <p class="rubric-level-desc-detailed">${RUBRIC_LEVELS[3].description}</p>
                ${competencyRubric[3].indicators.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Key Indicators:</strong>
                        <ul class="rubric-indicators-detailed">
                            ${competencyRubric[3].indicators.map(ind => `<li>${ind}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${competencyRubric[3].examples.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Examples:</strong>
                        <ul class="rubric-examples-detailed">
                            ${competencyRubric[3].examples.map(ex => `<li>${ex}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${competencyRubric[3].recommendations.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Recommendations for Growth:</strong>
                        <p class="rubric-recommendations-narrative">${competencyRubric[3].recommendations.join(' ')}</p>
                    </div>
                ` : ''}
            `;
            rubricLevelsDiv.appendChild(level3Div);
            
            // Level 2: Approaching Competency
            const level2Div = document.createElement('div');
            level2Div.className = 'competency-rubric-level';
            level2Div.innerHTML = `
                <div class="rubric-level-header-detailed rubric-level-2">
                    <strong>Level 2: Approaching Competency</strong>
                </div>
                <p class="rubric-level-desc-detailed">${RUBRIC_LEVELS[2].description}</p>
                ${competencyRubric[2].indicators.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Key Indicators:</strong>
                        <ul class="rubric-indicators-detailed">
                            ${competencyRubric[2].indicators.map(ind => `<li>${ind}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${competencyRubric[2].examples.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Examples:</strong>
                        <ul class="rubric-examples-detailed">
                            ${competencyRubric[2].examples.map(ex => `<li>${ex}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${competencyRubric[2].recommendations.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Recommendations for Growth:</strong>
                        <p class="rubric-recommendations-narrative">${competencyRubric[2].recommendations.join(' ')}</p>
                    </div>
                ` : ''}
            `;
            rubricLevelsDiv.appendChild(level2Div);
            
            // Level 1: Not Competent
            const level1Div = document.createElement('div');
            level1Div.className = 'competency-rubric-level';
            level1Div.innerHTML = `
                <div class="rubric-level-header-detailed rubric-level-1">
                    <strong>Level 1: Not Competent</strong>
                </div>
                <p class="rubric-level-desc-detailed">${RUBRIC_LEVELS[1].description}</p>
                ${competencyRubric[1].indicators.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Key Indicators:</strong>
                        <ul class="rubric-indicators-detailed">
                            ${competencyRubric[1].indicators.map(ind => `<li>${ind}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${competencyRubric[1].examples.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Examples:</strong>
                        <ul class="rubric-examples-detailed">
                            ${competencyRubric[1].examples.map(ex => `<li>${ex}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${competencyRubric[1].recommendations.length > 0 ? `
                    <div class="rubric-details-section">
                        <strong>Recommendations for Growth:</strong>
                        <p class="rubric-recommendations-narrative">${competencyRubric[1].recommendations.join(' ')}</p>
                    </div>
                ` : ''}
            `;
            rubricLevelsDiv.appendChild(level1Div);
            
            competencyRubricDiv.appendChild(rubricLevelsDiv);
            categoryDiv.appendChild(competencyRubricDiv);
        });
        
        competenciesSection.appendChild(categoryDiv);
    });
    
    rubricsContent.appendChild(competenciesSection);
}

// Event listeners for rubrics modal
if (viewRubricsBtn) {
    viewRubricsBtn.addEventListener('click', () => {
        displayRubricsForAllCompetencies();
        rubricsModal.style.display = 'block';
    });
}

if (closeRubricsBtn) {
    closeRubricsBtn.addEventListener('click', () => {
        rubricsModal.style.display = 'none';
    });
}

// Close modal when clicking outside of it
if (rubricsModal) {
    rubricsModal.addEventListener('click', (e) => {
        if (e.target === rubricsModal) {
            rubricsModal.style.display = 'none';
        }
    });
}

// Get importance label from numeric value
function getImportanceLabel(importance) {
    if (importance >= 4.5) return 'Extremely Important';
    if (importance >= 4.0) return 'Very Important';
    if (importance >= 3.5) return 'Important';
    if (importance >= 3.0) return 'Somewhat Important';
    return 'Less Important';
}

// Credentialing platform skills database
const CREDENTIALING_PLATFORMS = {
    NCLEX: {
        name: "NCLEX (National Council Licensure Examination)",
        abbreviation: "NCLEX",
        skills: [
            {
                name: "Safe and Effective Care Environment",
                importance: 4.9,
                category: "Patient Safety & Quality",
                description: "Creating and maintaining a safe, therapeutic environment for patients, including infection control, safety protocols, and risk reduction."
            },
            {
                name: "Health Promotion and Maintenance",
                importance: 4.7,
                category: "Patient Care & Assessment",
                description: "Promoting optimal health and preventing illness through patient education, health screening, and wellness strategies."
            },
            {
                name: "Psychosocial Integrity",
                importance: 4.6,
                category: "Professional Practice",
                description: "Supporting patients' emotional, mental, and social well-being, including coping mechanisms, therapeutic communication, and mental health support."
            },
            {
                name: "Physiological Integrity",
                importance: 4.9,
                category: "Patient Care & Assessment",
                description: "Maintaining patients' physical health through assessment, intervention, and management of physiological needs and responses."
            },
            {
                name: "Pharmacological and Parenteral Therapies",
                importance: 4.8,
                category: "Patient Care & Assessment",
                description: "Safely administering medications, monitoring therapeutic effects, and managing adverse reactions."
            },
            {
                name: "Reduction of Risk Potential",
                importance: 4.8,
                category: "Patient Safety & Quality",
                description: "Identifying and minimizing risks to patient safety, including complications, adverse events, and health hazards."
            },
            {
                name: "Basic Care and Comfort",
                importance: 4.7,
                category: "Patient Care & Assessment",
                description: "Providing comfort measures and assisting with activities of daily living to promote patient well-being."
            }
        ]
    },
    ANCC: {
        name: "ANCC (American Nurses Credentialing Center)",
        abbreviation: "ANCC",
        skills: [
            {
                name: "Evidence-Based Practice",
                importance: 4.7,
                category: "Clinical Decision Making",
                description: "Integrating best available evidence with clinical expertise and patient values to guide nursing practice decisions."
            },
            {
                name: "Quality Improvement",
                importance: 4.6,
                category: "Patient Safety & Quality",
                description: "Using data and systematic approaches to improve healthcare processes and patient outcomes."
            },
            {
                name: "Leadership",
                importance: 4.5,
                category: "Professional Practice",
                description: "Demonstrating leadership skills in clinical practice, including change management, team coordination, and professional development."
            },
            {
                name: "Professional Development",
                importance: 4.4,
                category: "Professional Practice",
                description: "Engaging in continuous learning and professional growth to maintain and enhance nursing competence."
            }
        ]
    },
    QSEN: {
        name: "QSEN (Quality and Safety Education for Nurses)",
        abbreviation: "QSEN",
        skills: [
            {
                name: "Patient-Centered Care",
                importance: 4.9,
                category: "Patient Care & Assessment",
                description: "Recognizing patients as partners in care, respecting their preferences and values, and engaging them in care decisions."
            },
            {
                name: "Teamwork and Collaboration",
                importance: 4.8,
                category: "Communication & Collaboration",
                description: "Functioning effectively within nursing and interprofessional teams, fostering open communication and mutual respect."
            },
            {
                name: "Evidence-Based Practice",
                importance: 4.7,
                category: "Clinical Decision Making",
                description: "Integrating best current evidence with clinical expertise and patient/family preferences for care delivery."
            },
            {
                name: "Quality Improvement",
                importance: 4.6,
                category: "Patient Safety & Quality",
                description: "Using data to monitor outcomes of care processes and implementing changes to continuously improve quality and safety."
            },
            {
                name: "Safety",
                importance: 4.9,
                category: "Patient Safety & Quality",
                description: "Minimizing risk of harm to patients and providers through system effectiveness and individual performance."
            },
            {
                name: "Informatics",
                importance: 4.5,
                category: "Communication & Collaboration",
                description: "Using information and technology to communicate, manage knowledge, mitigate error, and support decision-making."
            }
        ]
    },
    AACN: {
        name: "AACN (American Association of Critical-Care Nurses)",
        abbreviation: "AACN",
        skills: [
            {
                name: "Clinical Judgment",
                importance: 4.9,
                category: "Clinical Decision Making",
                description: "Making informed clinical decisions through critical thinking, pattern recognition, and evidence-based reasoning."
            },
            {
                name: "Advocacy and Moral Agency",
                importance: 4.7,
                category: "Professional Practice",
                description: "Acting as a patient advocate, protecting patient rights, and ensuring ethical care delivery."
            },
            {
                name: "Caring Practices",
                importance: 4.8,
                category: "Patient Care & Assessment",
                description: "Demonstrating nursing activities that create a compassionate, supportive, and therapeutic environment."
            },
            {
                name: "Collaboration",
                importance: 4.7,
                category: "Communication & Collaboration",
                description: "Working with healthcare team members, patients, and families to achieve optimal patient outcomes."
            },
            {
                name: "Systems Thinking",
                importance: 4.6,
                category: "Clinical Decision Making",
                description: "Understanding how healthcare systems work and how actions affect the system and patient outcomes."
            },
            {
                name: "Response to Diversity",
                importance: 4.5,
                category: "Professional Practice",
                description: "Providing culturally sensitive care that respects individual differences and values."
            },
            {
                name: "Facilitation of Learning",
                importance: 4.6,
                category: "Communication & Collaboration",
                description: "Facilitating learning for patients, families, and healthcare team members to promote health and wellness."
            },
            {
                name: "Clinical Inquiry",
                importance: 4.5,
                category: "Clinical Decision Making",
                description: "Pursuing knowledge and clinical questions to improve patient care and professional practice."
            }
        ]
    },
    CMSRN: {
        name: "CMSRN (Certified Medical-Surgical Registered Nurse)",
        abbreviation: "CMSRN",
        skills: [
            {
                name: "Holistic Patient Care",
                importance: 4.8,
                category: "Patient Care & Assessment",
                description: "Addressing physical, psychological, social, and spiritual needs of patients in medical-surgical settings."
            },
            {
                name: "Interprofessional Care",
                importance: 4.7,
                category: "Communication & Collaboration",
                description: "Collaborating effectively with physicians, therapists, pharmacists, and other healthcare professionals."
            },
            {
                name: "Nursing Teamwork",
                importance: 4.6,
                category: "Communication & Collaboration",
                description: "Working effectively within nursing teams, supporting colleagues, and maintaining professional relationships."
            },
            {
                name: "Care Management",
                importance: 4.7,
                category: "Clinical Decision Making",
                description: "Coordinating and managing patient care across the continuum, from admission through discharge."
            }
        ]
    }
};

// Merge skills from multiple credentialing platforms
function getCredentialingSkills(occupation) {
    // Safety check for occupation parameter
    if (!occupation) {
        console.warn('getCredentialingSkills called with undefined occupation');
        return [];
    }
    
    const allSkills = [];
    const skillMap = new Map(); // To avoid duplicates
    
    // Determine which platforms are relevant based on occupation
    const isNursing = occupation && occupation.title && (
        occupation.title.toLowerCase().includes('nurse') ||
        occupation.title.toLowerCase().includes('nursing') ||
        (occupation.code && occupation.code.startsWith('29-114')) ||
        (occupation.code && occupation.code.startsWith('29-117')) ||
        (occupation.code && occupation.code.startsWith('29-206'))
    );
    
    if (!isNursing) {
        return [];
    }
    
    // Add skills from all relevant platforms
    if (!CREDENTIALING_PLATFORMS) {
        console.error('CREDENTIALING_PLATFORMS is not defined');
        return [];
    }
    
    Object.values(CREDENTIALING_PLATFORMS).forEach(platform => {
        platform.skills.forEach(skill => {
            const skillKey = skill.name.toLowerCase();
            
            // If skill doesn't exist, add it; if it does, merge sources
            if (!skillMap.has(skillKey)) {
                skillMap.set(skillKey, {
                    ...skill,
                    sources: [platform.abbreviation]
                });
            } else {
                // Merge sources if skill already exists
                const existingSkill = skillMap.get(skillKey);
                if (!existingSkill.sources.includes(platform.abbreviation)) {
                    existingSkill.sources.push(platform.abbreviation);
                }
                // Use higher importance if available
                if (skill.importance > existingSkill.importance) {
                    existingSkill.importance = skill.importance;
                }
            }
        });
    });
    
    return Array.from(skillMap.values());
}

// Get fallback skills for display when API fails
function getFallbackSkills(occupation) {
    // Start with O*NET-based skills
    const onetSkills = [
        { 
            name: "Active Listening", 
            importance: 4.7, 
            category: "Communication & Collaboration",
            description: "Giving full attention to what others are saying, understanding the points being made, asking questions as appropriate, and not interrupting at inappropriate times."
        },
        { 
            name: "Critical Thinking", 
            importance: 4.8, 
            category: "Clinical Decision Making",
            description: "Using logic and reasoning to identify the strengths and weaknesses of alternative solutions, conclusions, or approaches to problems."
        },
        { 
            name: "Monitoring", 
            importance: 4.9, 
            category: "Patient Care & Assessment",
            description: "Monitoring/Assessing performance of yourself, other individuals, or organizations to make improvements or take corrective action."
        },
        { 
            name: "Judgment and Decision Making", 
            importance: 4.7, 
            category: "Clinical Decision Making",
            description: "Considering the relative costs and benefits of potential actions to choose the most appropriate one."
        },
        { 
            name: "Speaking", 
            importance: 4.6, 
            category: "Communication & Collaboration",
            description: "Talking to others to convey information effectively."
        },
        { 
            name: "Reading Comprehension", 
            importance: 4.5, 
            category: "Communication & Collaboration",
            description: "Understanding written sentences and paragraphs in work-related documents."
        },
        { 
            name: "Complex Problem Solving", 
            importance: 4.6, 
            category: "Clinical Decision Making",
            description: "Identifying complex problems and reviewing related information to develop and evaluate options and implement solutions."
        },
        { 
            name: "Social Perceptiveness", 
            importance: 4.5, 
            category: "Professional Practice",
            description: "Being aware of others' reactions and understanding why they react as they do."
        },
        { 
            name: "Service Orientation", 
            importance: 4.6, 
            category: "Professional Practice",
            description: "Actively looking for ways to help people."
        },
        { 
            name: "Time Management", 
            importance: 4.4, 
            category: "Professional Practice",
            description: "Managing one's own time and the time of others."
        },
        { 
            name: "Writing", 
            importance: 4.3, 
            category: "Communication & Collaboration",
            description: "Communicating effectively in writing as appropriate for the needs of the audience."
        },
        { 
            name: "Coordination", 
            importance: 4.5, 
            category: "Communication & Collaboration",
            description: "Adjusting actions in relation to others' actions."
        },
        { 
            name: "Instructing", 
            importance: 4.4, 
            category: "Communication & Collaboration",
            description: "Teaching others how to do something."
        },
        { 
            name: "Learning Strategies", 
            importance: 4.3, 
            category: "Professional Practice",
            description: "Selecting and using training/instructional methods and procedures appropriate for the situation when learning or teaching new things."
        },
        { 
            name: "Quality Control Analysis", 
            importance: 4.5, 
            category: "Patient Safety & Quality",
            description: "Conducting tests and inspections of products, services, or processes to evaluate quality or performance."
        },
        { 
            name: "Patient Assessment", 
            importance: 4.9, 
            category: "Patient Care & Assessment",
            description: "Conducting comprehensive physical and psychological assessments of patients to identify health status and care needs."
        },
        { 
            name: "Medication Administration", 
            importance: 4.8, 
            category: "Patient Care & Assessment",
            description: "Safely preparing and administering medications according to established protocols and patient-specific needs."
        },
        { 
            name: "Vital Signs Monitoring", 
            importance: 4.9, 
            category: "Patient Care & Assessment",
            description: "Accurately measuring and interpreting vital signs including blood pressure, pulse, temperature, and respiratory rate."
        },
        { 
            name: "Clinical Documentation", 
            importance: 4.6, 
            category: "Communication & Collaboration",
            description: "Maintaining accurate, timely, and comprehensive patient records in accordance with legal and professional standards."
        },
        { 
            name: "Patient Education", 
            importance: 4.5, 
            category: "Communication & Collaboration",
            description: "Educating patients and families about health conditions, treatments, and self-care strategies."
        },
        { 
            name: "Infection Control", 
            importance: 4.7, 
            category: "Patient Safety & Quality",
            description: "Implementing and maintaining infection prevention protocols to protect patients, staff, and visitors."
        },
        { 
            name: "Emergency Response", 
            importance: 4.8, 
            category: "Clinical Decision Making",
            description: "Responding quickly and effectively to medical emergencies and critical situations."
        },
        { 
            name: "Care Planning", 
            importance: 4.7, 
            category: "Clinical Decision Making",
            description: "Developing and implementing individualized care plans based on patient assessment and evidence-based practice."
        },
        { 
            name: "Delegation", 
            importance: 4.4, 
            category: "Professional Practice",
            description: "Appropriately delegating tasks to qualified team members while maintaining accountability for patient outcomes."
        },
        { 
            name: "Ethical Practice", 
            importance: 4.6, 
            category: "Professional Practice",
            description: "Applying ethical principles and professional standards in all aspects of patient care and professional interactions."
        }
    ];
    
    // Merge with credentialing platform skills
    let credentialingSkills = [];
    try {
        credentialingSkills = getCredentialingSkills(occupation);
    } catch (error) {
        console.error('Error getting credentialing skills in fallback:', error);
        credentialingSkills = [];
    }
    
    // Combine and deduplicate skills
    const allSkills = [...onetSkills];
    const skillMap = new Map();
    
    // Add O*NET skills to map
    onetSkills.forEach(skill => {
        skillMap.set(skill.name.toLowerCase(), { ...skill, sources: ['O*NET'] });
    });
    
    // Merge credentialing skills
    credentialingSkills.forEach(skill => {
        const key = skill.name.toLowerCase();
        if (skillMap.has(key)) {
            // Merge sources
            const existing = skillMap.get(key);
            existing.sources = [...new Set([...existing.sources, ...skill.sources])];
            // Use higher importance
            if (skill.importance > existing.importance) {
                existing.importance = skill.importance;
            }
        } else {
            skillMap.set(key, skill);
        }
    });
    
    return Array.from(skillMap.values());
}

// Fetch skills from O*NET API
async function fetchONETSkills(socCode, occupation = null) {
    // Note: O*NET API may require authentication and have CORS restrictions
    // You may need to use a proxy server in production
    
    // Try to fetch from O*NET API
    // Format: https://services.onetcenter.org/ws/online/occupations/{soc_code}/skills
    const apiUrl = `${ONET_API_BASE}occupations/${socCode}/skills`;
    
    try {
        // Attempt direct API call (may fail due to CORS)
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`O*NET API returned ${response.status}`);
        }
        
        const data = await response.json();
        return parseONETSkills(data, occupation);
        
    } catch (error) {
        // If direct API call fails, try alternative approach
        // You could use a proxy server here
        console.warn('Direct O*NET API call failed, using fallback:', error);
        throw error;
    }
}

// Map generic categories to role-specific categories
function mapToRoleSpecificCategory(skillName, genericCategory, occupation) {
    // Check if this is a nursing/healthcare role
    const isNursing = occupation.title && (
        occupation.title.toLowerCase().includes('nurse') ||
        occupation.title.toLowerCase().includes('nursing') ||
        occupation.code?.startsWith('29-114') || // Registered Nurses
        occupation.code?.startsWith('29-117') || // Nurse Practitioners
        occupation.code?.startsWith('29-206')    // LPN/LVN
    );
    
    if (!isNursing) {
        return genericCategory || 'General Skills';
    }
    
    // Nursing-specific category mapping
    const skillNameLower = skillName.toLowerCase();
    
    // Patient Care & Assessment
    if (skillNameLower.includes('monitoring') || 
        skillNameLower.includes('assessment') ||
        skillNameLower.includes('observation') ||
        skillNameLower.includes('evaluation')) {
        return 'Patient Care & Assessment';
    }
    
    // Clinical Decision Making
    if (skillNameLower.includes('critical thinking') ||
        skillNameLower.includes('judgment') ||
        skillNameLower.includes('decision making') ||
        skillNameLower.includes('problem solving') ||
        skillNameLower.includes('analysis')) {
        return 'Clinical Decision Making';
    }
    
    // Communication & Collaboration
    if (skillNameLower.includes('listening') ||
        skillNameLower.includes('speaking') ||
        skillNameLower.includes('communication') ||
        skillNameLower.includes('coordination') ||
        skillNameLower.includes('instructing') ||
        skillNameLower.includes('teaching') ||
        skillNameLower.includes('writing')) {
        return 'Communication & Collaboration';
    }
    
    // Patient Safety & Quality
    if (skillNameLower.includes('quality') ||
        skillNameLower.includes('safety') ||
        skillNameLower.includes('control')) {
        return 'Patient Safety & Quality';
    }
    
    // Professional Practice
    if (skillNameLower.includes('service orientation') ||
        skillNameLower.includes('social perceptiveness') ||
        skillNameLower.includes('time management') ||
        skillNameLower.includes('learning')) {
        return 'Professional Practice';
    }
    
    // Default to generic category if no match
    return genericCategory || 'General Skills';
}

// Parse O*NET skills data
function parseONETSkills(onetData, occupation = null) {
    const skills = [];
    
    // O*NET API returns skills in a specific format
    // Adjust parsing based on actual API response structure
    if (onetData.occupation && onetData.occupation.skills) {
        onetData.occupation.skills.forEach(skill => {
            const genericCategory = skill.category || 'General Skills';
            const roleSpecificCategory = occupation 
                ? mapToRoleSpecificCategory(skill.element_name || skill.name, genericCategory, occupation)
                : genericCategory;
            
            skills.push({
                name: skill.element_name || skill.name,
                category: roleSpecificCategory,
                importance: skill.importance || 3,
                level: skill.level || 3,
                description: skill.element_description || skill.description || null,
                sources: ['O*NET']
            });
        });
    } else if (onetData.skills) {
        // Alternative response format
        onetData.skills.forEach(skill => {
            const genericCategory = skill.category || 'General Skills';
            const roleSpecificCategory = occupation 
                ? mapToRoleSpecificCategory(skill.element_name || skill.name, genericCategory, occupation)
                : genericCategory;
            
            skills.push({
                name: skill.element_name || skill.name,
                category: roleSpecificCategory,
                importance: skill.importance || 3,
                level: skill.level || 3,
                description: skill.element_description || skill.description || null,
                sources: ['O*NET']
            });
        });
    }
    
    return skills;
}

// Question Type Configuration - Focused on scenarios with open-ended responses
const QUESTION_TYPE_CONFIG = {
    enabled: ['scenario'],  // Only scenario-based questions
    distribution: {
        'scenario': 1.0      // 100% scenario-based
    },
    responseType: 'open-ended'  // 'open-ended' or 'multiple-choice'
};

// Expanded rubric configuration for scenario-based questions - 3-level competency system
const RUBRIC_LEVELS = {
    1: {
        score: 1,
        label: "Not Competent",
        description: "Response shows limited understanding, inappropriate approach, or missing essential competencies",
        feedback: "This response does not meet competency standards. Focus on building foundational knowledge and skills.",
        indicators: [
            "Minimal or no recognition of key issues",
            "Lacks understanding of professional responsibilities",
            "No evidence of critical thinking or problem-solving",
            "Passive approach - waiting for direction from others",
            "Missing essential safety considerations",
            "No consideration of patient/family needs",
            "Inadequate or no documentation mentioned",
            "Does not demonstrate required professional competencies"
        ],
        examples: [
            "Would wait for supervisor/physician to handle everything",
            "Does not identify potential risks or complications",
            "No mention of assessment or monitoring",
            "Ignores family concerns or patient distress",
            "Fails to recognize critical situations requiring immediate action"
        ],
        recommendations: [
            "Review professional scope of practice and responsibilities",
            "Study evidence-based practice guidelines and standards",
            "Practice identifying key issues in case scenarios",
            "Learn to recognize safety concerns and red flags",
            "Develop basic assessment and documentation skills",
            "Seek mentorship and ask questions when uncertain",
            "Complete additional training in core competencies"
        ],
        nextSteps: "Focus on building foundational knowledge and understanding of professional responsibilities. Practice identifying key issues in scenarios before taking action. Consider additional training or mentorship."
    },
    2: {
        score: 2,
        label: "Approaching Competency",
        description: "Response shows developing understanding and some competency, but needs improvement to fully meet standards",
        feedback: "You're making progress toward competency. Continue developing your skills to fully meet professional standards.",
        indicators: [
            "Identifies some key issues but may miss important concerns",
            "Shows basic understanding of responsibilities",
            "Limited critical thinking - follows protocols but lacks analysis",
            "Seeks guidance appropriately but may be overly dependent",
            "Basic safety awareness but may miss subtle risks",
            "Some consideration of patient/family needs",
            "Mentions documentation but lacks detail or completeness",
            "Demonstrates some competencies but inconsistently"
        ],
        examples: [
            "Would inform supervisor and follow their direction",
            "Identifies obvious concerns but misses underlying issues",
            "Performs basic assessment but lacks depth",
            "Communicates with family but may not address all concerns",
            "Follows protocols but struggles with complex situations"
        ],
        recommendations: [
            "Develop deeper analytical thinking skills",
            "Practice comprehensive assessment techniques",
            "Learn to recognize patterns and connections between issues",
            "Build confidence in independent decision-making within scope",
            "Improve communication skills for complex situations",
            "Study case studies to see comprehensive approaches",
            "Practice prioritizing multiple concerns",
            "Focus on consistency in applying competencies"
        ],
        nextSteps: "Continue building your knowledge base and practice applying it in more complex scenarios. Focus on developing comprehensive thinking and consistent application of competencies."
    },
    3: {
        score: 3,
        label: "Competent",
        description: "Response demonstrates appropriate approach, good understanding, sound professional judgment, and meets competency standards",
        feedback: "Excellent response! You demonstrate competency in this area. Continue to refine and maintain your skills.",
        indicators: [
            "Identifies key issues and concerns appropriately",
            "Demonstrates good understanding of professional scope",
            "Shows evidence of critical thinking and analysis",
            "Takes appropriate independent action within scope",
            "Good safety awareness and risk identification",
            "Addresses patient/family needs appropriately",
            "Comprehensive documentation mentioned",
            "Coordinates with team members effectively",
            "Consistently demonstrates required competencies",
            "Shows professional judgment and decision-making"
        ],
        examples: [
            "Performs thorough assessment, identifies concerns, implements appropriate interventions, and communicates with team",
            "Recognizes potential complications and takes preventive measures",
            "Balances multiple priorities effectively",
            "Provides clear explanations to patients/families",
            "Demonstrates consistent competency across situations"
        ],
        recommendations: [
            "Continue staying current with evidence-based practice",
            "Practice maintaining consistency in complex situations",
            "Consider mentoring others to reinforce your own learning",
            "Engage in continuous professional development",
            "Participate in quality improvement initiatives",
            "Share knowledge and best practices with colleagues",
            "Seek opportunities to expand your expertise"
        ],
        nextSteps: "You demonstrate competency in this area. Continue to maintain and refine your skills through ongoing practice and professional development."
    }
};

// Map a question to a representative competency based on its skills
function mapQuestionToCompetency(question, competencies) {
    if (!competencies || competencies.length === 0) {
        return null;
    }
    
    // First, try to match by skill name if available
    if (question.skillName) {
        const skillNameLower = question.skillName.toLowerCase();
        let bestMatch = null;
        let bestMatchScore = 0;
        
        competencies.forEach(competency => {
            let matchScore = 0;
            
            // Check if skill name matches competency keywords
            if (competency.representativeSkills) {
                competency.representativeSkills.forEach(repSkill => {
                    const repSkillLower = repSkill.toLowerCase();
                    if (skillNameLower.includes(repSkillLower) || repSkillLower.includes(skillNameLower)) {
                        matchScore += 10; // High score for direct skill match
                    }
                });
            }
            
            // Check competency name and description for keyword matches
            const competencyNameLower = competency.name.toLowerCase();
            const competencyDescLower = (competency.description || '').toLowerCase();
            
            // Check for keyword matches in competency name/description
            const skillKeywords = skillNameLower.split(/\s+/);
            skillKeywords.forEach(keyword => {
                if (keyword.length > 3) { // Only match meaningful words
                    if (competencyNameLower.includes(keyword) || competencyDescLower.includes(keyword)) {
                        matchScore += 5;
                    }
                }
            });
            
            // Category match bonus
            if (question.category === competency.category) {
                matchScore += 3;
            }
            
            if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore;
                bestMatch = competency;
            }
        });
        
        if (bestMatch && bestMatchScore > 0) {
            return bestMatch;
        }
    }
    
    // Check if question has O*NET skills
    if (question.onetSkills && question.onetSkills.length > 0) {
        // Find competency that best matches the question's skills
        let bestMatch = null;
        let bestMatchScore = 0;
        
        competencies.forEach(competency => {
            let matchScore = 0;
            question.onetSkills.forEach(skill => {
                const skillNameLower = skill.name.toLowerCase();
                // Check if skill name matches any keywords in the competency
                if (competency.representativeSkills) {
                    competency.representativeSkills.forEach(repSkill => {
                        if (skillNameLower.includes(repSkill.toLowerCase()) || 
                            repSkill.toLowerCase().includes(skillNameLower)) {
                            matchScore += skill.importance || 0;
                        }
                    });
                }
                // Also check category match
                if (question.category === competency.category) {
                    matchScore += (skill.importance || 0) * 0.5;
                }
            });
            
            if (matchScore > bestMatchScore) {
                bestMatchScore = matchScore;
                bestMatch = competency;
            }
        });
        
        if (bestMatch && bestMatchScore > 0) {
            return bestMatch;
        }
    }
    
    // Fallback: match by category - distribute evenly across competencies in the same category
    const categoryMatches = competencies.filter(c => c.category === question.category);
    if (categoryMatches.length > 0) {
        // For now, return the most important, but we'll improve distribution in organizeQuestionsIntoBatches
        return categoryMatches.sort((a, b) => (b.importance || 0) - (a.importance || 0))[0];
    }
    
    // Last resort: return null
    return null;
}

// Generate scenario-based questions from O*NET skills
function generateQuestionsFromSkills(skills, occupation) {
    const generatedQuestions = [];
    let questionId = 1;
    
    // Group skills by category
    const skillsByCategory = {};
    skills.forEach(skill => {
        const category = skill.category || 'General Skills';
        if (!skillsByCategory[category]) {
            skillsByCategory[category] = [];
        }
        skillsByCategory[category].push(skill);
    });
    
    // Generate scenario questions for each category
    // Generate at least one question per skill, and at least 3 questions per category
    Object.keys(skillsByCategory).forEach(category => {
        const categorySkills = skillsByCategory[category]
            .sort((a, b) => (b.importance || 0) - (a.importance || 0));
        
        // First, generate one question for each unique skill in the category
        const questionsPerSkill = new Map();
        categorySkills.forEach(skill => {
            if (!questionsPerSkill.has(skill.name)) {
                const scenario = generateScenarioForSkill(skill, occupation);
                const skillStatement = scenario.skillStatement || `${skill.name} - ${scenario.skillDescription || category}`;
                generatedQuestions.push({
                    id: questionId++,
                    category: category,
                    categoryDisplay: skillStatement,
                    type: 'scenario',
                    skillName: skill.name,
                    scenario: scenario.scenario,
                    question: scenario.question,
                    responseType: QUESTION_TYPE_CONFIG.responseType,
                    options: scenario.options,
                    rubric: scenario.rubric,
                    rubricCriteria: scenario.rubricCriteria || null,
                    onetSkills: scenario.onetSkills || null
                });
                questionsPerSkill.set(skill.name, 1);
            }
        });
        
        // Then, generate additional questions to reach at least 3 per category
        // Distribute these across skills, prioritizing high-importance skills
        const minQuestionsPerCategory = Math.max(3, categorySkills.length);
        const currentCount = questionsPerSkill.size;
        
        if (currentCount < minQuestionsPerCategory) {
            const additionalNeeded = minQuestionsPerCategory - currentCount;
            for (let i = 0; i < additionalNeeded; i++) {
                // Cycle through skills, prioritizing by importance
                const skillIndex = i % categorySkills.length;
                const skill = categorySkills[skillIndex];
                const scenario = generateScenarioForSkill(skill, occupation);
                const skillStatement = scenario.skillStatement || `${skill.name} - ${scenario.skillDescription || category}`;
                generatedQuestions.push({
                    id: questionId++,
                    category: category,
                    categoryDisplay: skillStatement,
                    type: 'scenario',
                    skillName: skill.name,
                    scenario: scenario.scenario,
                    question: scenario.question,
                    responseType: QUESTION_TYPE_CONFIG.responseType,
                    options: scenario.options,
                    rubric: scenario.rubric,
                    rubricCriteria: scenario.rubricCriteria || null,
                    onetSkills: scenario.onetSkills || null
                });
            }
        }
    });
    
    return generatedQuestions;
}

// Helper function to sleep/delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate questions using AI when sections need more questions
// Includes retry logic with exponential backoff for rate limits
async function generateAIQuestions(category, categoryCompetencies, count, occupation, retryCount = 0) {
    if (!AI_QUESTION_GENERATION_ENABLED || !OPENAI_API_KEY) {
        return null;
    }
    
    const maxRetries = 3;
    const baseDelay = 2000; // Start with 2 seconds
    
    try {
        const apiKey = OPENAI_API_KEY;
        const occupationTitle = occupation?.title || 'the role';
        
        // Build list of competencies/skills for this category
        const competencyNames = categoryCompetencies.map(c => c.name).join(', ');
        const competencyDescriptions = categoryCompetencies
            .map(c => `- ${c.name}: ${c.description || ''}`)
            .join('\n');
        
        const prompt = `You are creating scenario-based assessment questions for a professional competency assessment.

OCCUPATION: ${occupationTitle}
CATEGORY: ${category}
COMPETENCIES TO ASSESS:
${competencyDescriptions}

TASK:
Generate ${count} scenario-based question(s) that assess the competencies listed above. Each question should:
1. Present a realistic professional scenario relevant to ${occupationTitle}
2. Ask how the person would handle the situation
3. Be specific to the category "${category}" and the competencies: ${competencyNames}
4. Be appropriate for assessing professional competency

For each question, provide:
- scenario: A brief, realistic professional scenario (2-3 sentences)
- question: A question asking how they would handle the situation (1 sentence)
- categoryDisplay: A short description linking to the competency (e.g., "${category} - ${categoryCompetencies[0]?.name || 'Assessment'}")

Return your response as a JSON array with this exact format:
[
  {
    "scenario": "Scenario text here",
    "question": "Question text here",
    "categoryDisplay": "Category - Competency name"
  }
]

Return ONLY the JSON array, no other text.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert at creating professional competency assessment questions. You return only valid JSON arrays.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        // Handle rate limiting (429) with retry
        if (response.status === 429) {
            if (retryCount < maxRetries) {
                const retryAfter = response.headers.get('Retry-After');
                const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, retryCount);
                
                console.log(`⏳ Rate limit hit (429). Retrying in ${delay/1000} seconds... (attempt ${retryCount + 1}/${maxRetries})`);
                await sleep(delay);
                return generateAIQuestions(category, categoryCompetencies, count, occupation, retryCount + 1);
            } else {
                throw new Error(`OpenAI API rate limit exceeded. Please wait a moment and try again. (Status: 429)`);
            }
        }

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content?.trim();
        
        // Extract JSON from response (handle cases where AI adds markdown code blocks)
        let jsonContent = content;
        if (content.startsWith('```')) {
            jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        const questions = JSON.parse(jsonContent);
        
        // Convert to our question format
        return questions.map(q => ({
            category: category,
            categoryDisplay: q.categoryDisplay || `${category} - ${categoryCompetencies[0]?.name || 'Assessment'}`,
            type: 'scenario',
            skillName: categoryCompetencies[0]?.name || category,
            scenario: q.scenario,
            question: q.question,
            responseType: QUESTION_TYPE_CONFIG.responseType,
            options: null,
            rubric: null,
            rubricCriteria: null,
            onetSkills: null
        }));
    } catch (error) {
        // If it's a rate limit error and we haven't exhausted retries, let it propagate for retry
        if (error.message.includes('429') && retryCount < maxRetries) {
            throw error;
        }
        console.error('Error generating AI questions:', error);
        return null;
    }
}

// Map a question to a detailed skill (competency) within a category based on skill name
function mapQuestionToDetailedSkill(question, categoryCompetencies) {
    if (categoryCompetencies.length === 0) {
        return null;
    }
    
    // If no skillName, try to extract from categoryDisplay
    let skillNameLower = (question.skillName || '').toLowerCase();
    if (!skillNameLower && question.categoryDisplay) {
        // Extract skill name from categoryDisplay (format: "Category - Skill Name")
        const parts = question.categoryDisplay.split(' - ');
        if (parts.length > 1) {
            skillNameLower = parts[parts.length - 1].toLowerCase();
        }
    }
    
    // Also check scenario and question text for keywords
    const scenarioText = (question.scenario || '').toLowerCase();
    const questionText = (question.question || '').toLowerCase();
    const allText = `${skillNameLower} ${scenarioText} ${questionText}`;
    
    let bestMatch = null;
    let bestMatchScore = 0;
    
    categoryCompetencies.forEach(competency => {
        let matchScore = 0;
        
        const competencyNameLower = competency.name.toLowerCase();
        const competencyDescLower = (competency.description || '').toLowerCase();
        
        // 1. Direct skill name match (highest priority)
        if (skillNameLower) {
            // Check if skill name matches competency keywords
            if (competency.representativeSkills) {
                competency.representativeSkills.forEach(repSkill => {
                    const repSkillLower = repSkill.toLowerCase();
                    if (skillNameLower.includes(repSkillLower) || repSkillLower.includes(skillNameLower)) {
                        matchScore += 20; // High score for direct skill match
                    }
                });
            }
            
            // Check if skill name contains key words from competency name
            const competencyKeywords = competencyNameLower.split(/\s+/).filter(w => w.length > 3);
            competencyKeywords.forEach(keyword => {
                if (skillNameLower.includes(keyword)) {
                    matchScore += 15;
                }
            });
        }
        
        // 2. Check categoryDisplay for competency name
        if (question.categoryDisplay) {
            const categoryDisplayLower = question.categoryDisplay.toLowerCase();
            if (categoryDisplayLower.includes(competencyNameLower)) {
                matchScore += 15;
            }
        }
        
        // 3. Check scenario and question text for competency keywords
        const competencyKeywords = [
            ...competencyNameLower.split(/\s+/).filter(w => w.length > 3),
            ...competencyDescLower.split(/\s+/).filter(w => w.length > 3)
        ];
        
        competencyKeywords.forEach(keyword => {
            if (allText.includes(keyword)) {
                matchScore += 3;
            }
        });
        
        // 4. Check for common professional terms in competency description
        const commonTerms = {
            'assessment': ['assess', 'evaluate', 'monitor', 'observe'],
            'intervention': ['intervene', 'treat', 'care', 'manage'],
            'safety': ['safety', 'risk', 'prevent', 'protect'],
            'communication': ['communicate', 'inform', 'educate', 'explain'],
            'coordination': ['coordinate', 'collaborate', 'team', 'work'],
            'decision': ['decide', 'judgment', 'analyze', 'reason'],
            'quality': ['quality', 'improve', 'standard', 'excellence'],
            'professional': ['professional', 'ethical', 'accountable', 'responsible']
        };
        
        Object.keys(commonTerms).forEach(term => {
            if (competencyNameLower.includes(term) || competencyDescLower.includes(term)) {
                commonTerms[term].forEach(synonym => {
                    if (allText.includes(synonym)) {
                        matchScore += 5;
                    }
                });
            }
        });
        
        // 5. Category match bonus (if question category matches)
        if (question.category === competency.category) {
            matchScore += 2;
        }
        
        if (matchScore > bestMatchScore) {
            bestMatchScore = matchScore;
            bestMatch = competency;
        }
    });
    
    // Lower threshold - accept matches with score >= 3 (was > 0, but that's too strict)
    return bestMatch && bestMatchScore >= 3 ? bestMatch : null;
}

// Organize questions into sections, one per competency category
// Each section ensures at least one question per detailed skill in that category
async function organizeQuestionsIntoBatches() {
    questionBatches = [];
    
    if (!questions || questions.length === 0) {
        console.error('No questions available to organize!');
        alert('Error: No questions were generated. Please try selecting a different role.');
        return;
    }
    
    if (!representativeCompetencies || representativeCompetencies.length === 0) {
        console.error('No representative competencies available!');
        alert('Error: No competencies available. Please try selecting a different role.');
        return;
    }
    
    // Group competencies by category
    const competenciesByCategory = {};
    representativeCompetencies.forEach(competency => {
        const category = competency.category || 'General Skills';
        if (!competenciesByCategory[category]) {
            competenciesByCategory[category] = [];
        }
        competenciesByCategory[category].push(competency);
    });
    
    // Group questions by category
    const questionsByCategory = {};
    questions.forEach(question => {
        const category = question.category || 'General Skills';
        if (!questionsByCategory[category]) {
            questionsByCategory[category] = [];
        }
        questionsByCategory[category].push(question);
    });
    
    // Debug: Log categories
    console.log('Competencies by category:', Object.keys(competenciesByCategory));
    console.log('Questions by category:', Object.keys(questionsByCategory));
    console.log('Total questions:', questions.length);
    console.log('Total competencies:', representativeCompetencies.length);
    
    // Collect all questions first (for distribution if needed)
    const allQuestions = [];
    Object.keys(questionsByCategory).forEach(qCategory => {
        allQuestions.push(...questionsByCategory[qCategory]);
    });
    
    // Create a section for EACH competency category
    // If a category has matching questions, use those; otherwise distribute questions evenly
    const categoriesWithBoth = [];
    const availableCompCategories = Object.keys(competenciesByCategory);
    
    availableCompCategories.forEach((compCategory, index) => {
        const categoryCompetencies = competenciesByCategory[compCategory];
        if (categoryCompetencies.length === 0) {
            return; // Skip categories with no competencies
        }
        
        // First, try to use questions that match this category name
        let categoryQuestions = questionsByCategory[compCategory] || [];
        
        // If no questions match this category name, distribute questions from the pool
        if (categoryQuestions.length === 0 && allQuestions.length > 0) {
            // Distribute questions round-robin across all competency categories
            categoryQuestions = allQuestions.filter((q, qIndex) => {
                return qIndex % availableCompCategories.length === index;
            });
            // Update the questionsByCategory for this category
            questionsByCategory[compCategory] = categoryQuestions;
            console.log(`Assigned ${categoryQuestions.length} questions to category "${compCategory}" (no direct match found)`);
        }
        
        // Always create a section for each competency category
        if (categoryQuestions.length > 0 || allQuestions.length === 0) {
            categoriesWithBoth.push(compCategory);
            console.log(`Category "${compCategory}": ${categoryQuestions.length} questions, ${categoryCompetencies.length} competencies`);
        }
    });
    
    // If we still have no categories (shouldn't happen, but safety check)
    if (categoriesWithBoth.length === 0 && Object.keys(questionsByCategory).length > 0) {
        // Fallback: create sections by question category
        Object.keys(questionsByCategory).forEach(qCategory => {
            const qs = questionsByCategory[qCategory];
            if (qs.length > 0) {
                categoriesWithBoth.push(qCategory);
                competenciesByCategory[qCategory] = representativeCompetencies.slice(0, 3); // Use first 3 competencies
            }
        });
    }
    
    console.log(`Total categories to process: ${categoriesWithBoth.length}`, categoriesWithBoth);
    
    // Process each category that has both (need to use for...of for async)
    for (const category of categoriesWithBoth) {
        const categoryCompetencies = competenciesByCategory[category];
        const categoryQuestions = questionsByCategory[category] || [];
        
        if (categoryQuestions.length === 0 || categoryCompetencies.length === 0) {
            continue; // Skip if still empty
        }
        
        // Map questions to detailed skills within this category
        const questionsBySkill = {};
        const unmappedQuestions = [];
        
        categoryQuestions.forEach(question => {
            const detailedSkill = mapQuestionToDetailedSkill(question, categoryCompetencies);
            if (detailedSkill) {
                const skillName = detailedSkill.name;
                if (!questionsBySkill[skillName]) {
                    questionsBySkill[skillName] = [];
                }
                questionsBySkill[skillName].push(question);
            } else {
                unmappedQuestions.push(question);
                // Log why question didn't match for debugging
                console.log(`Question ${question.id} didn't match any competency. skillName: "${question.skillName}", categoryDisplay: "${question.categoryDisplay}"`);
            }
        });
        
        // If we have unmapped questions, try to distribute them more intelligently
        if (unmappedQuestions.length > 0) {
            console.log(`Category "${category}" has ${unmappedQuestions.length} unmapped questions. Attempting intelligent distribution...`);
            
            // Distribute unmapped questions to competencies that have fewer questions
            const competencyQuestionCounts = categoryCompetencies.map(c => ({
                competency: c,
                count: questionsBySkill[c.name]?.length || 0
            })).sort((a, b) => a.count - b.count);
            
            unmappedQuestions.forEach((question, index) => {
                // Round-robin distribution to competencies with fewest questions
                const targetCompetency = competencyQuestionCounts[index % competencyQuestionCounts.length].competency;
                const skillName = targetCompetency.name;
                if (!questionsBySkill[skillName]) {
                    questionsBySkill[skillName] = [];
                }
                questionsBySkill[skillName].push(question);
                console.log(`Assigned unmapped question ${question.id} to competency "${skillName}"`);
            });
        }
        
        // Ensure each detailed skill has at least one question
        const sectionQuestions = [];
        const usedQuestionIds = new Set();
        
        // First pass: assign one question to each detailed skill
        categoryCompetencies.forEach(competency => {
            const skillQuestions = questionsBySkill[competency.name] || [];
            if (skillQuestions.length > 0) {
                // Take the first available question for this skill
                const question = skillQuestions.find(q => !usedQuestionIds.has(q.id)) || skillQuestions[0];
                if (question && !usedQuestionIds.has(question.id)) {
                    sectionQuestions.push(question);
                    usedQuestionIds.add(question.id);
                }
            }
        });
        
        // If no questions were mapped to skills, use all questions for this category
        if (sectionQuestions.length === 0 && categoryQuestions.length > 0) {
            console.warn(`No questions mapped to detailed skills in category "${category}". Using all questions for this category.`);
            sectionQuestions.push(...categoryQuestions.slice(0, Math.max(3, categoryCompetencies.length)));
            sectionQuestions.forEach(q => usedQuestionIds.add(q.id));
        }
        
        // Second pass: distribute remaining questions to skills that need more
        // Prioritize skills that currently have fewer questions
        const skillQuestionCounts = {};
        categoryCompetencies.forEach(competency => {
            skillQuestionCounts[competency.name] = sectionQuestions.filter(q => {
                const skill = mapQuestionToDetailedSkill(q, categoryCompetencies);
                return skill && skill.name === competency.name;
            }).length;
        });
        
        // Add unmapped questions and remaining mapped questions
        const remainingQuestions = [
            ...unmappedQuestions,
            ...categoryQuestions.filter(q => !usedQuestionIds.has(q.id))
        ];
        
        // Distribute remaining questions, ensuring we have at least 3 total per section
        const targetQuestionsPerSection = Math.max(3, categoryCompetencies.length);
        while (sectionQuestions.length < targetQuestionsPerSection && remainingQuestions.length > 0) {
            // Find the skill with the fewest questions
            const skillsByCount = categoryCompetencies
                .map(c => ({ competency: c, count: skillQuestionCounts[c.name] || 0 }))
                .sort((a, b) => a.count - b.count);
            
            // Try to find a question that matches the skill with fewest questions
            let questionAdded = false;
            for (const { competency } of skillsByCount) {
                const matchingQuestion = remainingQuestions.find(q => {
                    const skill = mapQuestionToDetailedSkill(q, categoryCompetencies);
                    return skill && skill.name === competency.name;
                });
                
                if (matchingQuestion) {
                    sectionQuestions.push(matchingQuestion);
                    usedQuestionIds.add(matchingQuestion.id);
                    skillQuestionCounts[competency.name] = (skillQuestionCounts[competency.name] || 0) + 1;
                    remainingQuestions.splice(remainingQuestions.indexOf(matchingQuestion), 1);
                    questionAdded = true;
                    break;
                }
            }
            
            // If no skill-specific match, add any remaining question
            if (!questionAdded && remainingQuestions.length > 0) {
                const question = remainingQuestions.shift();
                sectionQuestions.push(question);
                usedQuestionIds.add(question.id);
            }
        }
        
        // If we still don't have enough, add more questions up to target
        if (sectionQuestions.length < targetQuestionsPerSection) {
            const additionalNeeded = targetQuestionsPerSection - sectionQuestions.length;
            const additionalQuestions = categoryQuestions
                .filter(q => !usedQuestionIds.has(q.id))
                .slice(0, additionalNeeded);
            sectionQuestions.push(...additionalQuestions);
        }
        
        // If we still don't have enough questions, generate more using AI or pull from other categories
        if (sectionQuestions.length < 3) {
            const stillNeeded = 3 - sectionQuestions.length;
            
            // Try AI generation first if enabled
            if (AI_QUESTION_GENERATION_ENABLED && OPENAI_API_KEY) {
                try {
                    console.log(`🤖 Generating ${stillNeeded} AI question(s) for category "${category}"`);
                    
                    // Add a delay between requests to avoid rate limits
                    // Longer delay for later categories to prevent hitting rate limits
                    const categoryIndex = categoriesWithBoth.indexOf(category);
                    if (categoryIndex > 0) {
                        const delay = 3000 + (categoryIndex * 2000); // 3s, 5s, 7s, 9s... delays
                        console.log(`⏸️ Waiting ${delay/1000}s before generating questions for category "${category}" to avoid rate limits...`);
                        await sleep(delay);
                    }
                    
                    const aiQuestions = await generateAIQuestions(category, categoryCompetencies, stillNeeded, selectedOccupation || { title: 'Professional' });
                    if (aiQuestions && aiQuestions.length > 0) {
                        // Assign IDs to new questions
                        let maxId = Math.max(...questions.map(q => q.id || 0), 0);
                        aiQuestions.forEach(q => {
                            q.id = ++maxId;
                            q.category = category;
                            sectionQuestions.push(q);
                            usedQuestionIds.add(q.id);
                        });
                        console.log(`✅ Generated ${aiQuestions.length} AI question(s) for category "${category}"`);
                    } else {
                        throw new Error('AI generation returned no questions');
                    }
                } catch (error) {
                    // Check if it's a rate limit error
                    if (error.message && error.message.includes('rate limit')) {
                        console.warn(`⚠️ Rate limit exceeded for category "${category}". Falling back to other categories. Please wait before trying again.`);
                    } else {
                        console.warn(`⚠️ AI question generation failed for category "${category}", falling back to other categories:`, error);
                    }
                    // Fall through to pulling from other categories
                    const unusedQuestions = allQuestions.filter(q => !usedQuestionIds.has(q.id));
                    if (unusedQuestions.length > 0) {
                        const additionalQuestions = unusedQuestions.slice(0, stillNeeded);
                        sectionQuestions.push(...additionalQuestions);
                        additionalQuestions.forEach(q => usedQuestionIds.add(q.id));
                        console.log(`Supplemented category "${category}" with ${additionalQuestions.length} questions from other categories to reach minimum of 3`);
                    }
                }
            } else {
                // Fallback: Look for unused questions from any category
                const unusedQuestions = allQuestions.filter(q => !usedQuestionIds.has(q.id));
                if (unusedQuestions.length > 0) {
                    const additionalQuestions = unusedQuestions.slice(0, stillNeeded);
                    sectionQuestions.push(...additionalQuestions);
                    additionalQuestions.forEach(q => usedQuestionIds.add(q.id));
                    console.log(`Supplemented category "${category}" with ${additionalQuestions.length} questions from other categories to reach minimum of 3`);
                }
            }
        }
        
        // Create section for this category only if we have at least 3 questions
        if (sectionQuestions.length >= 3) {
            // Get the list of detailed skills covered in this section
            const coveredSkills = new Set();
            sectionQuestions.forEach(q => {
                const skill = mapQuestionToDetailedSkill(q, categoryCompetencies);
                if (skill) {
                    coveredSkills.add(skill.name);
                }
            });
            
            // If no skills were covered, use all competencies in the category
            const finalCompetencies = coveredSkills.size > 0 
                ? Array.from(coveredSkills)
                : categoryCompetencies.map(c => c.name);
            
            questionBatches.push({
                category: category,
                categoryDisplay: category, // Display the category name
                competency: null, // No single competency, this is a category section
                questions: sectionQuestions,
                competencies: finalCompetencies, // List of detailed skills covered
                categoryCompetencies: categoryCompetencies // Store all competencies in this category
            });
            
            console.log(`Created section for category "${category}" with ${sectionQuestions.length} questions covering ${finalCompetencies.length} detailed skills`);
        } else {
            console.warn(`Category "${category}" only has ${sectionQuestions.length} questions (minimum 3 required) - skipping section creation`);
        }
    }
    
    // Fallback: if no sections created, create at least one section with all questions
    if (questionBatches.length === 0) {
        console.error('No sections were created! Attempting fallback...');
        console.error('Available categories with competencies:', Object.keys(competenciesByCategory));
        console.error('Available categories with questions:', Object.keys(questionsByCategory));
        
        // Create a single section with all questions, using the first available category
        if (questions.length > 0) {
            const firstCategory = Object.keys(competenciesByCategory)[0] || 
                                 Object.keys(questionsByCategory)[0] || 
                                 'General Skills';
            const fallbackCompetencies = competenciesByCategory[firstCategory] || 
                                        representativeCompetencies.slice(0, 3) || 
                                        [];
            
            console.warn(`Creating fallback section with ${questions.length} questions in category "${firstCategory}"`);
            
            questionBatches.push({
                category: firstCategory,
                categoryDisplay: firstCategory,
                competency: null,
                questions: questions.slice(0, Math.max(3, questions.length)),
                competencies: fallbackCompetencies.map(c => c.name),
                categoryCompetencies: fallbackCompetencies
            });
        } else {
            alert('Error: Could not organize questions into sections. Please try selecting a different role.');
            return;
        }
    }
    
    // Update total sections display
    totalBatches.textContent = questionBatches.length;
    console.log(`Organized ${questions.length} questions into ${questionBatches.length} sections (one category per section)`);
    
    // Log section details for debugging
    questionBatches.forEach((section, idx) => {
        console.log(`Section ${idx + 1}: "${section.category}" - ${section.questions.length} questions covering ${section.competencies.length} detailed skills`);
        console.log(`  Detailed skills: ${section.competencies.join(', ')}`);
    });
}

// Show batch intro screen
function showBatchIntro(batchIndex) {
    if (batchIndex >= questionBatches.length) {
        // All batches complete
        calculateScores();
        batchFeedbackScreen.classList.remove('active');
        resultsScreen.classList.add('active');
        displayResults();
        return;
    }
    
    const batch = questionBatches[batchIndex];
    currentBatchIndex = batchIndex;
    
    batchIntroTitle.textContent = `Section ${batchIndex + 1} of ${questionBatches.length}: ${batch.categoryDisplay || batch.category || 'Assessment'}`;
    batchCompetenciesList.innerHTML = '';
    
    // Display the category and its detailed skills
    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'batch-competency-item';
    categoryHeader.style.marginBottom = '20px';
    
    const categoryName = document.createElement('div');
    categoryName.className = 'batch-competency-name';
    categoryName.style.fontWeight = '600';
    categoryName.style.fontSize = '1.3em';
    categoryName.style.color = '#667eea';
    categoryName.style.marginBottom = '15px';
    categoryName.textContent = batch.categoryDisplay || batch.category || 'Assessment';
    categoryHeader.appendChild(categoryName);
    
    // Display detailed skills in this category
    if (batch.categoryCompetencies && batch.categoryCompetencies.length > 0) {
        const skillsHeader = document.createElement('div');
        skillsHeader.style.fontWeight = '600';
        skillsHeader.style.color = '#4a5568';
        skillsHeader.style.marginBottom = '10px';
        skillsHeader.style.fontSize = '1em';
        skillsHeader.textContent = 'This section covers the following detailed skills:';
        categoryHeader.appendChild(skillsHeader);
        
        batch.categoryCompetencies.forEach(competency => {
            const skillItem = document.createElement('div');
            skillItem.className = 'batch-competency-item';
            skillItem.style.paddingLeft = '20px';
            skillItem.style.marginBottom = '8px';
            
            const skillName = document.createElement('div');
            skillName.style.fontWeight = '500';
            skillName.style.color = '#333';
            skillName.style.marginBottom = '4px';
            skillName.textContent = `• ${competency.name}`;
            skillItem.appendChild(skillName);
            
            if (competency.description) {
                const skillDesc = document.createElement('div');
                skillDesc.style.fontSize = '0.9em';
                skillDesc.style.color = '#666';
                skillDesc.style.fontStyle = 'italic';
                skillDesc.style.marginLeft = '15px';
                skillDesc.textContent = competency.description;
                skillItem.appendChild(skillDesc);
            }
            
            categoryHeader.appendChild(skillItem);
        });
    } else if (batch.competencies && batch.competencies.length > 0) {
        // Fallback: show competency names
        batch.competencies.forEach(competency => {
            const competencyItem = document.createElement('div');
            competencyItem.className = 'batch-competency-item';
            competencyItem.textContent = `• ${competency}`;
            categoryHeader.appendChild(competencyItem);
        });
    }
    
    batchCompetenciesList.appendChild(categoryHeader);
    
    batchIntroScreen.classList.add('active');
}

// Start answering questions in a batch - show all questions at once
function startBatchQuestions(batchIndex) {
    currentBatchIndex = batchIndex;
    currentBatchQuestionIndex = 0;
    batchAnswers = {};
    
    const batch = questionBatches[batchIndex];
    currentBatchNumber.textContent = batchIndex + 1;
    
    // Update progress
    const totalQuestions = questionBatches.reduce((sum, b) => sum + b.questions.length, 0);
    const completedQuestions = questionBatches.slice(0, batchIndex).reduce((sum, b) => sum + b.questions.length, 0);
    const progress = (completedQuestions / totalQuestions) * 100;
    progressFill.style.width = `${progress}%`;
    
    // Show all questions at once
    showAllBatchQuestions();
}

// Show all questions in the current batch at once
function showAllBatchQuestions() {
    const batch = questionBatches[currentBatchIndex];
    
    // Update question counter to show section info only
    if (questionNumber) questionNumber.textContent = '';
    if (questionsInBatch) questionsInBatch.textContent = '';
    
    questionContainer.innerHTML = '';
    
    // Create all questions
    batch.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.style.marginBottom = '40px';
        
        // Question number header
        const questionNumberHeader = document.createElement('div');
        questionNumberHeader.className = 'question-number-header';
        questionNumberHeader.style.fontWeight = 'bold';
        questionNumberHeader.style.marginBottom = '10px';
        questionNumberHeader.style.color = '#4a5568';
        questionNumberHeader.textContent = `Question ${index + 1} of ${batch.questions.length}`;
        questionDiv.appendChild(questionNumberHeader);
        
        // Scenario
        const scenarioDiv = document.createElement('div');
        scenarioDiv.className = 'scenario';
        scenarioDiv.textContent = question.scenario;
        questionDiv.appendChild(scenarioDiv);
        
        // Question
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = question.question;
        questionDiv.appendChild(questionText);
        
        // Response input (open-ended)
        const responseContainer = document.createElement('div');
        responseContainer.className = 'open-ended-response';
        
        const textarea = document.createElement('textarea');
        textarea.id = `response-${question.id}`;
        textarea.rows = 6;
        textarea.placeholder = 'Type your response here...';
        textarea.value = batchAnswers[question.id] || '';
        
        textarea.addEventListener('input', (e) => {
            batchAnswers[question.id] = e.target.value;
            updateBatchNavigation();
        });
        
        responseContainer.appendChild(textarea);
        questionDiv.appendChild(responseContainer);
        
        questionContainer.appendChild(questionDiv);
    });
    
    // Update navigation buttons - hide Previous/Next, show Complete Section
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    updateBatchNavigation();
}

// Show a question within the current batch (kept for backward compatibility, but not used)
function showBatchQuestion(questionIndex) {
    // This function is no longer used since we show all questions at once
    // Keeping it for backward compatibility
    showAllBatchQuestions();
}

// Update batch navigation button states
function updateBatchNavigation() {
    const batch = questionBatches[currentBatchIndex];
    const allAnswered = batch.questions.every(q => batchAnswers[q.id] && batchAnswers[q.id].trim().length > 0);
    
    // Ensure Previous/Next are hidden
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    
    // Show Complete Section button (always visible, enabled only when all answered)
    if (submitBatchBtn) {
        submitBatchBtn.style.display = 'block';
        submitBatchBtn.disabled = !allAnswered;
    }
}

// Show feedback for completed batch
function showBatchFeedback() {
    // Save batch answers to main answers object
    const batch = questionBatches[currentBatchIndex];
    batch.questions.forEach(q => {
        if (batchAnswers[q.id]) {
            answers[q.id] = batchAnswers[q.id];
        }
    });
    
    // Calculate feedback for this batch
    assessmentScreen.classList.remove('active');
    batchFeedbackScreen.classList.add('active');
    
    batchFeedbackSummary.innerHTML = '';
    
    const batchTitle = document.createElement('h3');
    batchTitle.textContent = `Section ${currentBatchIndex + 1} Feedback: ${batch.categoryDisplay}`;
    batchFeedbackSummary.appendChild(batchTitle);
    
    // Show feedback for each question in the batch
    batch.questions.forEach((question, index) => {
        const questionFeedbackDiv = document.createElement('div');
        questionFeedbackDiv.className = 'batch-question-feedback';
        
        const questionHeader = document.createElement('h4');
        questionHeader.textContent = `Question ${index + 1}: ${question.categoryDisplay || question.category}`;
        questionFeedbackDiv.appendChild(questionHeader);
        
        // Evaluate response and show feedback
        const response = batchAnswers[question.id] || '';
        // Note: evaluateOpenEndedResponse is async, but we'll evaluate synchronously here
        // In batch feedback, we evaluate all at once, so we use the keyword method directly
        const score = evaluateWithKeywords(question, response);
        // evaluateOpenEndedResponse stores feedback in global questionFeedback object
        const evaluation = questionFeedback[question.id] || null;
        
        const feedbackLevel = document.createElement('div');
        feedbackLevel.className = `feedback-level feedback-level-${score}`;
        
        // Add evaluation method indicator (batch feedback uses keyword method)
        const evaluationMethod = evaluation?.evaluationMethod || 'Keyword';
        const model = evaluation?.model || '';
        const methodText = evaluationMethod === 'AI' 
            ? ` 🤖 AI${model ? ` (${model})` : ''}`
            : ' 📝 Keyword';
        
        feedbackLevel.textContent = `Level ${score}/3: ${getLevelLabel(score)}${methodText}`;
        questionFeedbackDiv.appendChild(feedbackLevel);
        
        const feedbackText = document.createElement('div');
        feedbackText.className = 'feedback-text';
        feedbackText.textContent = evaluation ? evaluation.feedback : RUBRIC_LEVELS[score].feedback;
        questionFeedbackDiv.appendChild(feedbackText);
        
        if (question.rubric && question.rubric[score]) {
            const rubricFeedback = document.createElement('div');
            rubricFeedback.className = 'rubric-feedback';
            rubricFeedback.textContent = question.rubric[score];
            questionFeedbackDiv.appendChild(rubricFeedback);
        }
        
        // Expanded rubric details
        const rubricLevel = RUBRIC_LEVELS[score];
        const expandedRubric = document.createElement('div');
        expandedRubric.className = 'expanded-rubric-details';
        
        // Key Indicators
        if (rubricLevel.indicators && rubricLevel.indicators.length > 0) {
            const indicatorsDiv = document.createElement('div');
            indicatorsDiv.className = 'rubric-section';
            const indicatorsTitle = document.createElement('strong');
            indicatorsTitle.textContent = 'Key Indicators of This Level:';
            indicatorsDiv.appendChild(indicatorsTitle);
            const indicatorsList = document.createElement('ul');
            indicatorsList.className = 'rubric-list';
            rubricLevel.indicators.forEach(indicator => {
                const li = document.createElement('li');
                li.textContent = indicator;
                indicatorsList.appendChild(li);
            });
            indicatorsDiv.appendChild(indicatorsList);
            expandedRubric.appendChild(indicatorsDiv);
        }
        
        // Recommendations
        if (rubricLevel.recommendations && rubricLevel.recommendations.length > 0) {
            const recommendationsDiv = document.createElement('div');
            recommendationsDiv.className = 'rubric-section';
            const recommendationsTitle = document.createElement('strong');
            recommendationsTitle.textContent = 'Recommendations for Growth:';
            recommendationsDiv.appendChild(recommendationsTitle);
            const recommendationsList = document.createElement('ul');
            recommendationsList.className = 'rubric-list';
            rubricLevel.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsList.appendChild(li);
            });
            recommendationsDiv.appendChild(recommendationsList);
            expandedRubric.appendChild(recommendationsDiv);
        }
        
        // Next Steps
        if (rubricLevel.nextSteps) {
            const nextStepsDiv = document.createElement('div');
            nextStepsDiv.className = 'rubric-next-steps';
            nextStepsDiv.innerHTML = `<strong>Next Steps:</strong> ${rubricLevel.nextSteps}`;
            expandedRubric.appendChild(nextStepsDiv);
        }
        
        questionFeedbackDiv.appendChild(expandedRubric);
        batchFeedbackSummary.appendChild(questionFeedbackDiv);
    });
    
    // Show button to continue or view final results
    if (currentBatchIndex < questionBatches.length - 1) {
        nextBatchBtn.style.display = 'block';
        viewFinalResultsBtn.style.display = 'none';
    } else {
        nextBatchBtn.style.display = 'none';
        viewFinalResultsBtn.style.display = 'block';
    }
}

// Helper function to get level label
function getLevelLabel(level) {
    const labels = {
        1: 'Not Competent',
        2: 'Approaching Competency',
        3: 'Competent'
    };
    return labels[level] || 'Unknown';
}

// Update navigation for batch questions
function showPreviousBatchQuestion() {
    if (currentBatchQuestionIndex > 0) {
        showBatchQuestion(currentBatchQuestionIndex - 1);
    }
}

function showNextBatchQuestion() {
    const batch = questionBatches[currentBatchIndex];
    if (currentBatchQuestionIndex < batch.questions.length - 1) {
        showBatchQuestion(currentBatchQuestionIndex + 1);
    }
}

// Generate scenario-based question for a specific skill
function generateScenarioForSkill(skill, occupation) {
    const skillName = skill.name.toLowerCase();
    const occupationTitle = occupation.title.toLowerCase();
    
    // Check if occupation is in nursing
    const isNursing = occupationTitle.includes('nurse') || occupationTitle.includes('nursing') || occupationTitle.includes('health') && (occupationTitle.includes('therapist') || occupationTitle.includes('practitioner'));
    
    // Generate occupation-specific scenarios first
    if (isNursing) {
        return generateNursingScenario(skill, occupation);
    }
    
    // Default scenario for non-nursing roles - use nursing scenario as default
    // Since we're only supporting nursing, this should rarely be reached
    return generateNursingScenario(skill, occupation);
}

// Generate nursing-specific scenarios
function generateNursingScenario(skill, occupation) {
    const skillName = skill.name.toLowerCase();
    
    const nursingScenarios = {
        'patient care': {
            skillStatement: "Clinical Assessment and Intervention for Deteriorating Patients",
            skillDescription: "Recognizing and responding to patient deterioration, performing comprehensive assessments, implementing evidence-based interventions, and coordinating care",
            scenario: `You're caring for Mrs. Johnson, a 68-year-old patient who was admitted 2 days ago for pneumonia. She has a history of COPD, Type 2 diabetes, and hypertension. During your 2 PM assessment, you notice:
            
• Her oxygen saturation has dropped from 94% to 88% on 2L nasal cannula
• She's becoming increasingly short of breath and using accessory muscles
• Her respiratory rate has increased from 18 to 28 breaths per minute
• She's anxious and says "I can't catch my breath"
• Her blood pressure is 150/95 (baseline 130/80)
• Her temperature is 38.2°C (was 37.8°C this morning)
• She's producing thick, yellow-green sputum

The attending physician, Dr. Martinez, is in emergency surgery and won't be available for at least 2 hours. The charge nurse is handling a code blue on another unit. Mrs. Johnson's daughter just arrived and is visibly distressed, asking "What's happening? Is my mother okay?"

You have standing orders for oxygen titration and PRN medications, but no specific orders for this acute change.`,
            question: `How would you respond to this deteriorating patient situation?`,
            onetSkills: [
                { name: "Active Listening", importance: 4.5, description: "Understanding patient and family concerns" },
                { name: "Critical Thinking", importance: 4.8, description: "Analyzing patient condition and making clinical decisions" },
                { name: "Judgment and Decision Making", importance: 4.7, description: "Determining appropriate interventions" },
                { name: "Monitoring", importance: 4.9, description: "Assessing vital signs and patient status" },
                { name: "Speaking", importance: 4.5, description: "Communicating with family and healthcare team" },
                { name: "Complex Problem Solving", importance: 4.6, description: "Managing multiple concerns simultaneously" }
            ],
            rubricCriteria: {
                level4: "Describes immediate comprehensive assessment, evidence-based interventions (oxygen titration, positioning, medication administration), rapid team coordination, clear family communication with updates, and thorough documentation of interventions and outcomes",
                level3: "Describes thorough assessment, appropriate interventions within scope (oxygen adjustment, notify team), documentation, and basic family communication",
                level2: "Describes basic monitoring, documentation of changes, and informing supervisor or charge nurse",
                level1: "Describes waiting for physician or minimal action without immediate intervention"
            },
            options: [
                { 
                    text: "Wait for the physician to become available and follow their instructions", 
                    value: 1,
                    rubricLevel: 1
                },
                { 
                    text: "Monitor the patient closely, document observations, and inform the charge nurse", 
                    value: 2,
                    rubricLevel: 2
                },
                { 
                    text: "Assess the patient thoroughly, implement appropriate nursing interventions within your scope, document everything, and communicate with the healthcare team", 
                    value: 3,
                    rubricLevel: 3
                },
                { 
                    text: "Immediately assess and stabilize the patient, implement evidence-based interventions, coordinate with the healthcare team, provide clear communication to family, and document comprehensively", 
                    value: 4,
                    rubricLevel: 4
                }
            ],
            rubric: {
                1: "Needs to develop independent clinical judgment and proactive patient care",
                2: "Shows basic patient monitoring but lacks comprehensive assessment skills",
                3: "Demonstrates good clinical judgment and appropriate nursing interventions",
                4: "Shows excellent clinical judgment with comprehensive patient care and communication"
            }
        },
        'communication': {
            skillStatement: "Patient-Centered Communication and Medication Education",
            skillDescription: "Effectively communicating with patients and families about medications, addressing concerns, and providing education to promote compliance and understanding",
            scenario: `You're receiving a handoff report from the night shift nurse for Mr. Rodriguez, a 55-year-old patient admitted yesterday for acute myocardial infarction (heart attack). During the handoff, the night nurse mentions:

• Patient was restless overnight and refused his 2 AM dose of metoprolol (beta-blocker)
• Family members were present until 11 PM and expressed concerns about "too many medications"
• Patient's wife called the unit at 3 AM asking about discharge planning
• Night nurse notes: "Patient seems anxious about medications, might need education"

When you enter the room for your initial assessment, you find:
• Mr. Rodriguez is sitting up in bed, appears anxious
• His wife is at the bedside, looking concerned
• You notice the 2 AM metoprolol is still at the bedside, untouched
• Patient says: "I don't want to take all these pills. They make me feel weird. My wife is worried too."

His current medications include: metoprolol, aspirin, atorvastatin, and lisinopril. The cardiologist's note emphasizes the critical importance of medication compliance for preventing another cardiac event.`,
            question: `How would you address this medication non-compliance situation and communicate with the patient and family?`,
            onetSkills: [
                { name: "Active Listening", importance: 4.7, description: "Understanding patient and family concerns" },
                { name: "Speaking", importance: 4.8, description: "Educating patient and family about medications" },
                { name: "Social Perceptiveness", importance: 4.6, description: "Recognizing patient and family anxiety" },
                { name: "Service Orientation", importance: 4.5, description: "Providing patient-centered care" },
                { name: "Critical Thinking", importance: 4.5, description: "Assessing barriers to compliance" }
            ],
            options: [
                { 
                    text: "Explain that they need to follow doctor's orders and report non-compliance to the physician", 
                    value: 1,
                    rubricLevel: 1
                },
                { 
                    text: "Listen to their concerns and provide basic information about the medications", 
                    value: 2,
                    rubricLevel: 2
                },
                { 
                    text: "Actively listen to concerns, provide education about medications and their importance, involve the healthcare team, and develop a collaborative plan", 
                    value: 3,
                    rubricLevel: 3
                },
                { 
                    text: "Conduct a thorough assessment of concerns, provide comprehensive education, coordinate with the healthcare team to address issues, develop a patient-centered plan, and follow up to ensure understanding", 
                    value: 4,
                    rubricLevel: 4
                }
            ],
            rubric: {
                1: "Needs to develop patient-centered communication and education skills",
                2: "Shows basic listening skills but lacks comprehensive patient education",
                3: "Demonstrates good patient communication and collaborative care approach",
                4: "Shows excellent patient-centered care with comprehensive education and follow-up"
            }
        },
        'critical thinking': {
            skillStatement: "Systems Analysis and Quality Improvement in Medication Safety",
            skillDescription: "Identifying patterns in medication errors, analyzing root causes, and developing systematic solutions to prevent patient harm",
            scenario: `You're working the day shift on a busy medical-surgical unit. Over the past week, you've noticed several concerning patterns:

• Three different nurses have made near-miss medication errors involving look-alike/sound-alike medications (hydralazine vs. hydroxyzine)
• Two patients received medications 1-2 hours late because the medication cart wasn't restocked properly
• Yesterday, a patient's scheduled antibiotic was missed entirely until you discovered it during end-of-shift chart review
• The unit has been short-staffed, with nurses covering 6-7 patients each (normal ratio is 5:1)
• New graduate nurses have mentioned feeling overwhelmed with the medication administration process

During today's medication pass, you discover that Patient A's scheduled 10 AM dose of warfarin (blood thinner) is missing from the medication cart. The patient is post-operative and requires careful anticoagulation management. You check the MAR (Medication Administration Record) and confirm it should have been given. The previous shift's nurse documented it as given, but you can't find evidence in the medication cart or patient's medication drawer.

You're concerned this might be part of a larger systemic issue that could lead to patient harm.`,
            question: `How would you address this medication safety concern and the pattern of errors you've identified?`,
            onetSkills: [
                { name: "Critical Thinking", importance: 4.8, description: "Analyzing problems systematically" },
                { name: "Complex Problem Solving", importance: 4.9, description: "Addressing complex technical issues" },
                { name: "Systems Analysis", importance: 4.6, description: "Understanding system components and interactions" },
                { name: "Judgment and Decision Making", importance: 4.7, description: "Making decisions about approach" },
                { name: "Writing", importance: 4.4, description: "Documenting findings and solutions" }
            ],
            options: [
                { 
                    text: "Report individual errors as they occur and let management handle it", 
                    value: 1,
                    rubricLevel: 1
                },
                { 
                    text: "Document the errors you notice and mention them to your supervisor", 
                    value: 2,
                    rubricLevel: 2
                },
                { 
                    text: "Collect data on the errors, analyze the pattern, document findings, and present to the charge nurse and quality improvement team", 
                    value: 3,
                    rubricLevel: 3
                },
                { 
                    text: "Systematically investigate the root cause, collect comprehensive data, develop evidence-based recommendations, present to leadership, and participate in implementing solutions", 
                    value: 4,
                    rubricLevel: 4
                }
            ],
            rubric: {
                1: "Needs to develop systems thinking and quality improvement skills",
                2: "Shows basic awareness but lacks systematic approach to problem-solving",
                3: "Demonstrates good analytical thinking and quality improvement approach",
                4: "Shows excellent systems thinking with proactive quality improvement leadership"
            }
        }
    };
    
    // Try to match skill to nursing scenario
    for (const [key, scenario] of Object.entries(nursingScenarios)) {
        if (skillName.includes(key) || key.includes(skillName.split(' ')[0])) {
            return scenario;
        }
    }
    
    // Additional detailed nursing scenarios
    const detailedScenarios = {
        'handoff': {
            skillStatement: "Critical Review and Prioritization During Nurse Handoff",
            skillDescription: "Receiving and analyzing handoff information, identifying gaps and concerns, prioritizing patient care based on acuity, and ensuring continuity of care",
            scenario: `You're receiving a shift handoff from Nurse Sarah, who is ending her 12-hour night shift. She's giving you report on three patients:

**Patient 1 - Mr. Chen (Room 204):**
• 72-year-old, post-operative day 2 from hip replacement
• History of atrial fibrillation, on anticoagulation
• Overnight: "Restless, complained of pain, refused 2 AM pain medication"
• Vital signs stable, but Sarah notes: "Seems a bit off, but vitals are fine"
• Family called at 4 AM concerned about his confusion

**Patient 2 - Ms. Williams (Room 206):**
• 45-year-old, admitted for uncontrolled diabetes and diabetic ketoacidosis
• Insulin drip running, blood sugars trending down but still elevated
• Sarah mentions: "Blood sugar was 280 at 6 AM, gave extra insulin per protocol"
• Patient's daughter is expected to arrive this morning with questions

**Patient 3 - Mr. Thompson (Room 208):**
• 58-year-old, admitted for chest pain, ruled out MI, awaiting stress test
• Sarah's report: "Uneventful night, patient sleeping well"
• However, you notice in the chart that his last set of vital signs was documented 4 hours ago
• His morning labs show elevated troponin levels that weren't addressed in the handoff

Sarah is rushing to finish report because she's already 15 minutes past her shift end time. You have 15 minutes before you need to start morning medications and assessments.`,
            question: `How would you handle this handoff situation and prioritize your care?`,
            onetSkills: [
                { name: "Active Listening", importance: 4.8, description: "Receiving and processing handoff information" },
                { name: "Critical Thinking", importance: 4.7, description: "Analyzing handoff for gaps and concerns" },
                { name: "Reading Comprehension", importance: 4.6, description: "Reviewing charts, labs, and documentation" },
                { name: "Judgment and Decision Making", importance: 4.9, description: "Prioritizing patient care based on acuity" },
                { name: "Time Management", importance: 4.4, description: "Managing time constraints effectively" }
            ],
            rubricCriteria: {
                level4: "Describes thorough handoff review, immediate prioritization of concerns, clarification of unclear information, rapid assessment of high-risk patients, communication with oncoming team, and comprehensive documentation of findings",
                level3: "Describes reviewing handoff information, identifying concerns, asking clarifying questions, and prioritizing patient care",
                level2: "Describes basic acceptance of handoff and proceeding with routine care",
                level1: "Describes accepting handoff without questioning or identifying concerns"
            }
        },
        'patient case': {
            skillStatement: "Comprehensive Patient Assessment and Management of Complex Cases",
            skillDescription: "Conducting thorough assessments of patients with multiple comorbidities, recognizing complications, coordinating interdisciplinary care, and advocating for patient needs",
            scenario: `You're assigned to care for Mrs. Patricia Martinez, a 78-year-old patient admitted to your medical-surgical unit. Here's her case:

**Admission Information:**
• Admitted 3 days ago from the emergency department
• Chief complaint: "Weakness, falls at home, not eating"
• Medical history: Hypertension, Type 2 diabetes, mild dementia, osteoarthritis
• Lives alone with home health aide visits 3x/week
• Daughter lives 2 hours away, visits on weekends

**Current Status:**
• Day 3 of hospitalization
• Diagnosis: Dehydration, urinary tract infection, possible malnutrition
• Receiving IV antibiotics (ceftriaxone) and IV fluids
• Blood sugars have been erratic: ranging from 180-320 mg/dL
• Has been refusing some meals, saying "food doesn't taste right"
• Physical therapy started yesterday - patient was too weak to participate
• This morning: Patient's daughter called, very concerned. Says: "My mother sounds confused on the phone. She's never been like this. What's going on?"

**Current Assessment Findings:**
• Alert but appears more confused than on admission
• Oriented to person only (was oriented x3 on admission)
• Urine output decreased over past 12 hours
• Skin turgor poor, dry mucous membranes
• Blood pressure: 100/60 (baseline 140/85)
• Heart rate: 98, regular
• Temperature: 37.9°C
• Blood sugar: 285 mg/dL (checked 1 hour ago)
• Last antibiotic dose: 6 hours ago (should be every 12 hours)

The physician hasn't rounded yet today. You're concerned about the patient's deterioration.`,
            question: `How would you assess and manage this complex patient case?`,
            onetSkills: [
                { name: "Critical Thinking", importance: 4.9, description: "Analyzing complex patient presentation" },
                { name: "Judgment and Decision Making", importance: 4.8, description: "Making clinical decisions about interventions" },
                { name: "Monitoring", importance: 4.7, description: "Ongoing assessment of patient condition" },
                { name: "Complex Problem Solving", importance: 4.9, description: "Managing multiple comorbidities and complications" },
                { name: "Active Listening", importance: 4.4, description: "Understanding family concerns" },
                { name: "Speaking", importance: 4.5, description: "Communicating with interdisciplinary team and family" }
            ],
            rubricCriteria: {
                level4: "Describes comprehensive assessment of all systems, recognition of potential delirium/UTI complications, immediate interventions, coordination with interdisciplinary team, clear communication with family, and proactive problem-solving",
                level3: "Describes thorough assessment, identification of key concerns, appropriate interventions, and communication with team",
                level2: "Describes basic assessment and reporting findings to supervisor",
                level1: "Describes minimal assessment or waiting for physician direction"
            }
        }
    };
    
    // Try detailed scenarios first
    for (const [key, scenario] of Object.entries(detailedScenarios)) {
        if (skillName.includes(key) || key.includes(skillName.split(' ')[0])) {
            return scenario;
        }
    }
    
    // Default nursing scenario
    return {
        scenario: `You're providing care to a patient with complex medical needs. The patient has multiple comorbidities and the situation requires careful clinical judgment, effective communication with the healthcare team, and coordination of care. The patient's condition requires ongoing assessment and you must balance multiple priorities while ensuring patient safety and quality care.`,
        question: `How would you approach this complex patient care situation?`,
        options: [
            { 
                text: "Follow standard protocols and seek guidance from senior staff", 
                value: 1,
                rubricLevel: 1
            },
            { 
                text: "Assess the situation, follow protocols, and consult with colleagues as needed", 
                value: 2,
                rubricLevel: 2
            },
            { 
                text: "Conduct comprehensive assessment, apply clinical judgment, implement appropriate interventions, and coordinate care effectively", 
                value: 3,
                rubricLevel: 3
            },
            { 
                text: "Perform thorough assessment, apply advanced clinical reasoning, implement evidence-based interventions, coordinate seamlessly with team, and document comprehensively", 
                value: 4,
                rubricLevel: 4
            }
        ],
        rubric: {
            1: "Needs to develop independent clinical judgment and assessment skills",
            2: "Shows basic clinical skills but needs more confidence in decision-making",
            3: "Demonstrates good clinical judgment and comprehensive patient care",
            4: "Shows excellent clinical reasoning with advanced patient care expertise"
        }
    };
}

// Removed: Education scenarios - keeping only nursing
// The generateEducationScenario function has been removed

// Store feedback for each question
let questionFeedback = {};

// Generate fallback scenario questions when O*NET API is unavailable
function generateFallbackQuestions(occupation) {
    const occupationCode = occupation.code;
    
    // Role-specific scenario questions - ensure at least 3 questions per category
    const fallbackQuestions = {
        "29-1141.00": [ // Registered Nurses
            {
                id: 1,
                category: "Patient Care",
                categoryDisplay: "Clinical Assessment and Intervention for Deteriorating Patients",
                type: "scenario",
                skillName: "Patient Care",
                scenario: "A patient under your care is showing signs of distress. Their vital signs are concerning, but they're not in immediate critical condition. The attending physician is in surgery and unavailable. The patient's family is asking questions and seems anxious.",
                question: "How would you handle this situation?",
                options: [
                    { text: "Wait for the physician to become available and follow their instructions", value: 1, rubricLevel: 1 },
                    { text: "Monitor the patient closely, document observations, and inform the charge nurse", value: 2, rubricLevel: 2 },
                    { text: "Assess the patient thoroughly, implement appropriate nursing interventions within your scope, document everything, and communicate with the healthcare team", value: 3, rubricLevel: 3 },
                    { text: "Immediately assess and stabilize the patient, implement evidence-based interventions, coordinate with the healthcare team, provide clear communication to family, and document comprehensively", value: 4, rubricLevel: 4 }
                ],
                rubric: {
                    1: "Needs to develop independent clinical judgment and proactive patient care",
                    2: "Shows basic patient monitoring but lacks comprehensive assessment skills",
                    3: "Demonstrates good clinical judgment and appropriate nursing interventions",
                    4: "Shows excellent clinical judgment with comprehensive patient care and communication"
                }
            },
            {
                id: 2,
                category: "Nurse Handoff",
                categoryDisplay: "Critical Review and Prioritization During Nurse Handoff",
                type: "scenario",
                skillName: "Nurse Handoff",
                scenario: `You're receiving a shift handoff from Nurse Sarah, who is ending her 12-hour night shift. She's giving you report on three patients:

**Patient 1 - Mr. Chen (Room 204):**
• 72-year-old, post-operative day 2 from hip replacement
• History of atrial fibrillation, on anticoagulation
• Overnight: "Restless, complained of pain, refused 2 AM pain medication"
• Vital signs stable, but Sarah notes: "Seems a bit off, but vitals are fine"
• Family called at 4 AM concerned about his confusion

**Patient 2 - Ms. Williams (Room 206):**
• 45-year-old, admitted for uncontrolled diabetes and diabetic ketoacidosis
• Insulin drip running, blood sugars trending down but still elevated
• Sarah mentions: "Blood sugar was 280 at 6 AM, gave extra insulin per protocol"
• Patient's daughter is expected to arrive this morning with questions

**Patient 3 - Mr. Thompson (Room 208):**
• 58-year-old, admitted for chest pain, ruled out MI, awaiting stress test
• Sarah's report: "Uneventful night, patient sleeping well"
• However, you notice in the chart that his last set of vital signs was documented 4 hours ago
• His morning labs show elevated troponin levels that weren't addressed in the handoff

Sarah is rushing to finish report because she's already 15 minutes past her shift end time. You have 15 minutes before you need to start morning medications and assessments.`,
                question: "How would you handle this handoff situation and prioritize your care?",
                onetSkills: [
                    { name: "Active Listening", importance: 4.8, description: "Receiving and processing handoff information" },
                    { name: "Critical Thinking", importance: 4.7, description: "Analyzing handoff for gaps and concerns" },
                    { name: "Reading Comprehension", importance: 4.6, description: "Reviewing charts, labs, and documentation" },
                    { name: "Judgment and Decision Making", importance: 4.9, description: "Prioritizing patient care based on acuity" },
                    { name: "Time Management", importance: 4.4, description: "Managing time constraints effectively" }
                ],
                rubricCriteria: {
                    level4: "Describes thorough handoff review, immediate prioritization of concerns, clarification of unclear information, rapid assessment of high-risk patients, communication with oncoming team, and comprehensive documentation of findings",
                    level3: "Describes reviewing handoff information, identifying concerns, asking clarifying questions, and prioritizing patient care",
                    level2: "Describes basic acceptance of handoff and proceeding with routine care",
                    level1: "Describes accepting handoff without questioning or identifying concerns"
                },
                options: [
                    { text: "Accept the handoff as given and proceed with your normal routine, starting with morning medications", value: 1, rubricLevel: 1 },
                    { text: "Review the handoff notes, identify any obvious concerns, and proceed with care while keeping an eye on those patients", value: 2, rubricLevel: 2 },
                    { text: "Thoroughly review all handoff information, ask clarifying questions about concerns, prioritize high-risk patients, and conduct focused assessments", value: 3, rubricLevel: 3 },
                    { text: "Immediately review handoff comprehensively, identify and clarify all concerns (especially Mr. Thompson's elevated troponin), prioritize care based on acuity, conduct rapid assessments of high-risk patients, communicate findings to team, and document thoroughly", value: 4, rubricLevel: 4 }
                ],
                rubric: {
                    1: "Needs to develop critical handoff review and prioritization skills",
                    2: "Shows basic handoff acceptance but lacks thorough review and prioritization",
                    3: "Demonstrates good handoff review with appropriate prioritization and questioning",
                    4: "Shows excellent handoff management with comprehensive review, prioritization, and proactive patient safety"
                }
            },
            {
                id: 3,
                category: "Patient Case Management",
                categoryDisplay: "Comprehensive Patient Assessment and Management of Complex Cases",
                type: "scenario",
                skillName: "Patient Case Management",
                scenario: `You're assigned to care for Mrs. Patricia Martinez, a 78-year-old patient admitted to your medical-surgical unit. Here's her case:

**Admission Information:**
• Admitted 3 days ago from the emergency department
• Chief complaint: "Weakness, falls at home, not eating"
• Medical history: Hypertension, Type 2 diabetes, mild dementia, osteoarthritis
• Lives alone with home health aide visits 3x/week
• Daughter lives 2 hours away, visits on weekends

**Current Status:**
• Day 3 of hospitalization
• Diagnosis: Dehydration, urinary tract infection, possible malnutrition
• Receiving IV antibiotics (ceftriaxone) and IV fluids
• Blood sugars have been erratic: ranging from 180-320 mg/dL
• Has been refusing some meals, saying "food doesn't taste right"
• Physical therapy started yesterday - patient was too weak to participate
• This morning: Patient's daughter called, very concerned. Says: "My mother sounds confused on the phone. She's never been like this. What's going on?"

**Current Assessment Findings:**
• Alert but appears more confused than on admission
• Oriented to person only (was oriented x3 on admission)
• Urine output decreased over past 12 hours
• Skin turgor poor, dry mucous membranes
• Blood pressure: 100/60 (baseline 140/85)
• Heart rate: 98, regular
• Temperature: 37.9°C
• Blood sugar: 285 mg/dL (checked 1 hour ago)
• Last antibiotic dose: 6 hours ago (should be every 12 hours)

The physician hasn't rounded yet today. You're concerned about the patient's deterioration.`,
                question: "How would you assess and manage this complex patient case?",
                rubricCriteria: {
                    level4: "Describes comprehensive assessment of all systems, recognition of potential delirium/UTI complications, immediate interventions, coordination with interdisciplinary team, clear communication with family, and proactive problem-solving",
                    level3: "Describes thorough assessment, identification of key concerns, appropriate interventions, and communication with team",
                    level2: "Describes basic assessment and reporting findings to supervisor",
                    level1: "Describes minimal assessment or waiting for physician direction"
                },
                options: [
                    { text: "Wait for the physician to round and report your concerns then", value: 1, rubricLevel: 1 },
                    { text: "Perform a focused assessment, document findings, and inform the charge nurse", value: 2, rubricLevel: 2 },
                    { text: "Conduct comprehensive assessment, implement appropriate interventions (check antibiotic timing, assess for delirium, monitor hydration), coordinate with team, and communicate with family", value: 3, rubricLevel: 3 },
                    { text: "Immediately perform comprehensive assessment, recognize potential complications (delirium, worsening UTI, dehydration), implement evidence-based interventions, coordinate with interdisciplinary team, communicate proactively with family, and advocate for patient needs", value: 4, rubricLevel: 4 }
                ],
                rubric: {
                    1: "Needs to develop independent clinical judgment and comprehensive patient assessment skills",
                    2: "Shows basic assessment skills but lacks comprehensive evaluation and proactive intervention",
                    3: "Demonstrates good clinical judgment with thorough assessment and appropriate interventions",
                    4: "Shows excellent clinical reasoning with comprehensive assessment, recognition of complications, and proactive patient advocacy"
                }
            },
            {
                id: 4,
                category: "Medication Safety",
                categoryDisplay: "Medication Administration Safety and Error Prevention",
                type: "scenario",
                skillName: "Medication Safety",
                scenario: `You're preparing to administer medications to your assigned patients. As you're reviewing the medication administration record (MAR) for Patient A, you notice something concerning:

**Patient A - Mr. Johnson (Room 302):**
• 65-year-old male, admitted for heart failure exacerbation
• Scheduled medications include: Lisinopril 10mg PO daily, Furosemide 40mg PO twice daily, Metformin 500mg PO twice daily
• You notice the MAR shows Lisinopril was given at 8 AM this morning, but the patient's blood pressure at 9 AM was 88/52 (low for this patient)
• The patient's morning lab results show elevated creatinine (1.8, up from baseline 1.2)
• The patient is also on Furosemide, which can affect kidney function
• You're scheduled to give the next dose of Furosemide in 30 minutes

Additionally, you notice a pattern: Over the past week, there have been 3 medication errors documented on your unit - all involving similar high-risk medications. The charge nurse mentioned in the morning huddle that medication safety is a priority, but no specific changes have been implemented yet.`,
                question: "How would you address this medication safety concern and the pattern of errors you've identified?",
                onetSkills: [
                    { name: "Critical Thinking", importance: 4.9, description: "Analyzing medication safety concerns" },
                    { name: "Judgment and Decision Making", importance: 4.8, description: "Making decisions about medication administration" },
                    { name: "Reading Comprehension", importance: 4.6, description: "Reviewing MAR, labs, and patient data" },
                    { name: "Active Learning", importance: 4.4, description: "Learning from error patterns" },
                    { name: "Speaking", importance: 4.5, description: "Communicating safety concerns" }
                ],
                rubricCriteria: {
                    level4: "Describes comprehensive medication review, recognition of potential interactions/contraindications, immediate safety actions (holding/administering with caution), reporting to appropriate team members, advocating for system improvements, and contributing to error prevention strategies",
                    level3: "Describes thorough medication review, identification of concerns, appropriate actions, and communication with team",
                    level2: "Describes basic medication review and reporting concerns to supervisor",
                    level1: "Describes proceeding with medication administration without thorough review"
                },
                options: [
                    { text: "Proceed with giving the scheduled medications as ordered, since they're on the MAR", value: 1, rubricLevel: 1 },
                    { text: "Review the medications, note the concerns, and ask the charge nurse before administering", value: 2, rubricLevel: 2 },
                    { text: "Thoroughly review all medications, assess patient condition, hold medications if unsafe, communicate concerns to physician and charge nurse, and document findings", value: 3, rubricLevel: 3 },
                    { text: "Comprehensively review medications and patient status, recognize potential drug interactions and contraindications, hold unsafe medications, immediately communicate with physician and pharmacy, advocate for medication review, report pattern of errors to safety committee, and implement safety measures", value: 4, rubricLevel: 4 }
                ],
                rubric: {
                    1: "Needs to develop medication safety awareness and critical review skills",
                    2: "Shows basic medication review but lacks comprehensive safety assessment",
                    3: "Demonstrates good medication safety practices with thorough review and communication",
                    4: "Shows excellent medication safety expertise with comprehensive review, error prevention, and system advocacy"
                }
            },
            {
                id: 5,
                category: "Communication",
                categoryDisplay: "Effective Communication with Patients, Families, and Healthcare Team",
                type: "scenario",
                skillName: "Communication",
                scenario: `You're caring for Mrs. Rodriguez, a 55-year-old patient who was admitted yesterday for chest pain. After extensive testing, the cardiologist has determined she needs cardiac catheterization, which is scheduled for tomorrow morning.

**Current Situation:**
• The cardiologist explained the procedure to the patient this morning, but you notice the patient seems confused and anxious
• The patient's husband, who speaks limited English, arrived 30 minutes ago and is asking many questions
• The patient's adult daughter (who is a nurse at another hospital) just called and is very concerned. She says: "My mother doesn't understand what's happening. She's scared. Can someone explain this better? Also, I'm worried about her diabetes management during the procedure."
• You review the chart and notice:
  - The patient has Type 2 diabetes, but her blood sugars haven't been checked since admission
  - The pre-procedure instructions mention NPO (nothing by mouth) after midnight, but no specific diabetes management plan is documented
  - The patient's current medications include Metformin and Glipizide
• The cardiologist has left for the day, and the on-call physician is covering multiple units

You have 20 minutes before you need to start your next medication pass. The patient and family are clearly distressed and need clear communication and reassurance.`,
                question: "How would you handle this communication situation and address the family's concerns?",
                onetSkills: [
                    { name: "Active Listening", importance: 4.8, description: "Understanding patient and family concerns" },
                    { name: "Speaking", importance: 4.9, description: "Clear communication with patients and families" },
                    { name: "Social Perceptiveness", importance: 4.6, description: "Recognizing emotional needs" },
                    { name: "Service Orientation", importance: 4.7, description: "Addressing patient and family needs" },
                    { name: "Coordination", importance: 4.5, description: "Coordinating with healthcare team" }
                ],
                rubricCriteria: {
                    level4: "Describes comprehensive communication approach including active listening, clear explanation of procedure and diabetes management, addressing all concerns, coordinating with healthcare team for diabetes plan, providing emotional support, ensuring understanding, and advocating for patient needs",
                    level3: "Describes good communication with patient and family, explanation of concerns, and coordination with team",
                    level2: "Describes basic communication and reporting concerns to supervisor",
                    level1: "Describes minimal communication or deferring to physician"
                },
                options: [
                    { text: "Tell the family that the cardiologist will explain everything tomorrow before the procedure", value: 1, rubricLevel: 1 },
                    { text: "Provide basic information about the procedure and report the diabetes concern to the charge nurse", value: 2, rubricLevel: 2 },
                    { text: "Sit with patient and family, explain the procedure clearly, address their concerns, coordinate with on-call physician about diabetes management, and ensure understanding", value: 3, rubricLevel: 3 },
                    { text: "Immediately sit with patient and family, actively listen to all concerns, provide clear and comprehensive explanation of procedure and diabetes management plan, coordinate with on-call physician and pharmacy for diabetes protocol, use interpreter services if needed, provide emotional support, ensure complete understanding, and document communication", value: 4, rubricLevel: 4 }
                ],
                rubric: {
                    1: "Needs to develop effective communication and patient advocacy skills",
                    2: "Shows basic communication but lacks comprehensive patient and family engagement",
                    3: "Demonstrates good communication skills with thorough explanation and coordination",
                    4: "Shows excellent communication expertise with comprehensive patient/family engagement and advocacy"
                }
            }
        ],
    };
    
    // Default scenario questions
    const defaultQuestions = [
        {
            id: 1,
            category: "Technical Skills",
            categoryDisplay: "Technical Problem-Solving and System Analysis",
            type: "scenario",
            skillName: "Technical Skills",
            scenario: "You're faced with a challenging technical problem that requires expertise in your field. The situation is time-sensitive and requires both technical competence and good judgment.",
            question: "How would you handle this situation?",
            options: [
                { text: "I would need significant guidance and support from others", value: 1, rubricLevel: 1 },
                { text: "I would research the situation, seek some advice, and work through it step by step", value: 2, rubricLevel: 2 },
                { text: "I would analyze the situation, apply my knowledge, and handle it independently", value: 3, rubricLevel: 3 },
                { text: "I would quickly assess the situation, apply advanced techniques, and help others learn from the experience", value: 4, rubricLevel: 4 }
            ],
            rubric: {
                1: "Needs development in this skill area",
                2: "Shows developing competency but needs more experience",
                3: "Demonstrates proficient skills in this area",
                4: "Shows advanced mastery of this skill"
            }
        },
        {
            id: 2,
            category: "Communication",
            categoryDisplay: "Stakeholder Communication and Transparency",
            type: "scenario",
            skillName: "Communication",
            scenario: "You've discovered a significant issue with a project timeline that will delay delivery by two weeks. The stakeholder meeting is in 30 minutes, and your manager hasn't been informed yet.",
            question: "What would you do?",
            options: [
                { text: "Wait until after the meeting to discuss it privately with your manager", value: 1, rubricLevel: 1 },
                { text: "Quickly inform your manager via email before the meeting", value: 2, rubricLevel: 2 },
                { text: "Brief your manager immediately with the issue, potential impacts, and proposed solutions", value: 3, rubricLevel: 3 },
                { text: "Immediately brief your manager with the issue, impacts, solutions, and a communication plan for stakeholders", value: 4, rubricLevel: 4 }
            ],
            rubric: {
                1: "Needs to develop proactive communication and transparency",
                2: "Shows basic communication but lacks urgency and detail",
                3: "Demonstrates good communication with problem-solving approach",
                4: "Shows excellent communication with strategic thinking"
            }
        }
    ];
    
    return fallbackQuestions[occupationCode] || defaultQuestions;
}

function showQuestion(index) {
    currentQuestionIndex = index;
    const question = questions[index];
    
    if (!question) {
        console.error('Question not found at index:', index);
        return;
    }
    
    // Update progress
    const progress = ((index + 1) / questions.length) * 100;
    progressFill.style.width = progress + '%';
    questionNumber.textContent = index + 1;
    
    // Clear previous question
    questionContainer.innerHTML = '';
    
    // Create question HTML
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';
    
    const categorySpan = document.createElement('span');
    categorySpan.className = 'question-category';
    // Use detailed skill statement if available, otherwise use category
    categorySpan.textContent = question.categoryDisplay || question.category;
    
    questionDiv.appendChild(categorySpan);
    
    // Display scenario if it's a scenario question
    if (question.type === 'scenario' && question.scenario) {
        const scenarioBox = document.createElement('div');
        scenarioBox.className = 'scenario-box';
        
        // Format scenario text - convert bullet points and sections to HTML
        let formattedScenario = question.scenario
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
            .replace(/^•\s+(.+)$/gm, '<li>$1</li>') // Bullet points
            .replace(/\n\n/g, '</p><p>') // Paragraph breaks
            .replace(/^(.+)$/gm, function(match) {
                // If it's not already a list item or bold, make it a paragraph
                if (!match.includes('<li>') && !match.includes('<strong>') && match.trim()) {
                    return '<p>' + match + '</p>';
                }
                return match;
            });
        
        // Wrap consecutive list items in a ul
        formattedScenario = formattedScenario.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/g, '<ul>$1</ul>');
        
        scenarioBox.innerHTML = `
            <h4>Scenario</h4>
            <div class="scenario-content">${formattedScenario}</div>
        `;
        questionDiv.appendChild(scenarioBox);
        
        const questionTitle = document.createElement('h3');
        questionTitle.textContent = question.question;
        questionDiv.appendChild(questionTitle);
    } else {
        const questionTitle = document.createElement('h3');
        questionTitle.textContent = question.question;
        questionDiv.appendChild(questionTitle);
    }
    
    // Add question-specific content
    if (question.responseType === 'open-ended' || (question.type === 'scenario' && QUESTION_TYPE_CONFIG.responseType === 'open-ended')) {
        // Open-ended text response
        const responseContainer = document.createElement('div');
        responseContainer.className = 'open-ended-response';
        
        const textArea = document.createElement('textarea');
        textArea.id = `response-${question.id}`;
        textArea.className = 'response-textarea';
        textArea.rows = 8;
        textArea.placeholder = 'Please describe how you would handle this situation. Be specific about your approach, actions, and reasoning.';
        
        // Load existing answer if available
        if (answers[question.id] && typeof answers[question.id] === 'string') {
            textArea.value = answers[question.id];
        }
        
        textArea.addEventListener('input', () => {
            const responseText = textArea.value.trim();
            if (responseText.length > 0) {
                answers[question.id] = responseText;
                updateNavigationButtons();
            } else {
                delete answers[question.id];
                updateNavigationButtons();
            }
        });
        
        // Add character count
        const charCount = document.createElement('div');
        charCount.className = 'char-count';
        charCount.textContent = '0 characters';
        
        textArea.addEventListener('input', () => {
            const count = textArea.value.length;
            charCount.textContent = `${count} characters`;
            if (count > 0) {
                charCount.style.color = '#667eea';
            } else {
                charCount.style.color = '#999';
            }
        });
        
        // Show rubric criteria as guidance
        if (question.rubricCriteria) {
            const rubricGuidance = document.createElement('div');
            rubricGuidance.className = 'rubric-guidance';
            // Map old 4-level criteria to new 3-level system: level4->level3, level3->level3, level2->level2, level1->level1
            const level3Text = question.rubricCriteria.level4 || question.rubricCriteria.level3 || '';
            const level2Text = question.rubricCriteria.level2 || '';
            const level1Text = question.rubricCriteria.level1 || '';
            rubricGuidance.innerHTML = `
                <h5>What makes a strong response:</h5>
                <ul>
                    <li><strong>Competent (Level 3):</strong> ${level3Text}</li>
                    <li><strong>Approaching Competency (Level 2):</strong> ${level2Text}</li>
                    <li><strong>Not Competent (Level 1):</strong> ${level1Text}</li>
                </ul>
            `;
            responseContainer.appendChild(rubricGuidance);
        }
        
        // Add evaluate button
        const evaluateBtn = document.createElement('button');
        evaluateBtn.className = 'btn btn-primary';
        evaluateBtn.textContent = 'Evaluate Response';
        evaluateBtn.style.marginTop = '15px';
        evaluateBtn.disabled = true;
        
        evaluateBtn.addEventListener('click', async () => {
            const responseText = textArea.value.trim();
            if (responseText.length >= 10) {
                evaluateBtn.disabled = true;
                // Show evaluation method in button text
                const evaluationText = AI_EVALUATION_ENABLED && OPENAI_API_KEY 
                    ? `Evaluating with AI...` 
                    : `Evaluating...`;
                evaluateBtn.textContent = evaluationText;
                try {
                    const score = await evaluateOpenEndedResponse(question, responseText);
                    showFeedback(question, score, questionDiv);
                } catch (error) {
                    console.error('Error evaluating response:', error);
                    // Fallback to keyword evaluation
                    const score = evaluateWithKeywords(question, responseText);
                    showFeedback(question, score, questionDiv);
                } finally {
                    evaluateBtn.disabled = false;
                    evaluateBtn.textContent = 'Evaluate Response';
                }
            }
        });
        
        // Enable evaluate button when there's enough text
        textArea.addEventListener('input', () => {
            const responseText = textArea.value.trim();
            evaluateBtn.disabled = responseText.length < 10;
        });
        
        responseContainer.appendChild(textArea);
        responseContainer.appendChild(charCount);
        responseContainer.appendChild(evaluateBtn);
        questionDiv.appendChild(responseContainer);
        
        // Show existing feedback if available
        if (questionFeedback[question.id]) {
            showFeedback(question, questionFeedback[question.id].level, questionDiv);
        }
        
    } else if (question.type === 'scenario' || question.type === 'multiple-choice') {
        // Multiple choice options
        const optionsList = document.createElement('ul');
        optionsList.className = 'options';
        
        question.options.forEach((option, optIndex) => {
            const optionItem = document.createElement('li');
            optionItem.className = 'option';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question-${question.id}`;
            radio.id = `q${question.id}-opt${optIndex}`;
            radio.value = option.value;
            
            if (answers[question.id] === option.value) {
                radio.checked = true;
            }
            
            radio.addEventListener('change', () => {
                answers[question.id] = parseInt(option.value);
                const rubricLevel = option.rubricLevel || option.value;
                showFeedback(question, rubricLevel);
                updateNavigationButtons();
            });
            
            const label = document.createElement('label');
            label.htmlFor = `q${question.id}-opt${optIndex}`;
            label.textContent = option.text;
            
            optionItem.appendChild(radio);
            optionItem.appendChild(label);
            optionsList.appendChild(optionItem);
        });
        
        questionDiv.appendChild(optionsList);
        
        // Show feedback if answer already selected
        if (answers[question.id] !== undefined) {
            const selectedOption = question.options.find(opt => opt.value === answers[question.id]);
            const rubricLevel = selectedOption?.rubricLevel || answers[question.id];
            showFeedback(question, rubricLevel, questionDiv);
        }
    } else if (question.type === 'rating') {
        const ratingContainer = document.createElement('div');
        ratingContainer.className = 'rating-container';
        
        const ratingScale = document.createElement('div');
        ratingScale.className = 'rating-scale';
        
        for (let i = question.scale.min; i <= question.scale.max; i++) {
            const ratingOption = document.createElement('div');
            ratingOption.className = 'rating-option';
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = `question-${question.id}`;
            radio.id = `q${question.id}-rating${i}`;
            radio.value = i;
            
            if (answers[question.id] === i) {
                radio.checked = true;
            }
            
            radio.addEventListener('change', () => {
                answers[question.id] = parseInt(i);
                updateNavigationButtons();
            });
            
            const circle = document.createElement('div');
            circle.className = 'rating-circle';
            circle.textContent = i;
            
            const label = document.createElement('div');
            label.className = 'rating-label';
            label.textContent = question.scale.labels[i - 1];
            
            ratingOption.appendChild(radio);
            ratingOption.appendChild(circle);
            ratingOption.appendChild(label);
            ratingScale.appendChild(ratingOption);
        }
        
        ratingContainer.appendChild(ratingScale);
        questionDiv.appendChild(ratingContainer);
    }
    
    questionContainer.appendChild(questionDiv);
    updateNavigationButtons();
}

// Show feedback based on rubric
function showFeedback(question, rubricLevel, container = null) {
    const targetContainer = container || questionContainer;
    
    // Remove existing feedback
    const existingFeedback = targetContainer.querySelector('.feedback-box');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    const rubric = RUBRIC_LEVELS[rubricLevel];
    if (!rubric) return;
    
    // Check if this evaluation used AI
    const evaluation = questionFeedback[question.id];
    const evaluationMethod = evaluation?.evaluationMethod || 'Keyword';
    const model = evaluation?.model || '';
    const methodBadge = evaluationMethod === 'AI' 
        ? `<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 10px;">🤖 AI Evaluated${model ? ` (${model})` : ''}</span>`
        : `<span style="background: #6b7280; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 10px;">📝 Keyword Match</span>`;
    
    const feedbackBox = document.createElement('div');
    feedbackBox.className = 'feedback-box';
    feedbackBox.innerHTML = `
        <h4>Feedback ${methodBadge}</h4>
        <div class="feedback-level feedback-level-${rubricLevel}">
            <strong>${rubric.label}</strong>
        </div>
        <p class="feedback-description">${rubric.description}</p>
        ${question.rubric && question.rubric[rubricLevel] ? `<p class="feedback-rubric">${question.rubric[rubricLevel]}</p>` : ''}
        <p class="feedback-message">${rubric.feedback}</p>
    `;
    
    targetContainer.appendChild(feedbackBox);
    
    // Store feedback for results (preserve existing evaluation method if available)
    questionFeedback[question.id] = {
        level: rubricLevel,
        label: rubric.label,
        description: rubric.description,
        rubric: question.rubric ? question.rubric[rubricLevel] : null,
        feedback: rubric.feedback,
        evaluationMethod: evaluation?.evaluationMethod || 'Keyword',
        model: evaluation?.model || ''
    };
}

function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    
    const currentQuestion = questions[currentQuestionIndex];
    let isAnswered = false;
    
    if (currentQuestion) {
        const answer = answers[currentQuestion.id];
        if (currentQuestion.responseType === 'open-ended' || (currentQuestion.type === 'scenario' && QUESTION_TYPE_CONFIG.responseType === 'open-ended')) {
            // For open-ended, check if there's text (at least 10 characters)
            isAnswered = answer && typeof answer === 'string' && answer.trim().length >= 10;
        } else {
            isAnswered = answer !== undefined;
        }
    }
    
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    
    if (isLastQuestion) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
        submitBtn.disabled = !isAnswered;
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
        nextBtn.disabled = !isAnswered;
    }
}

function showPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        showQuestion(currentQuestionIndex - 1);
    }
}

function showNextQuestion() {
    if (currentQuestionIndex < questions.length - 1 && answers[questions[currentQuestionIndex].id] !== undefined) {
        showQuestion(currentQuestionIndex + 1);
    }
}

function submitAssessment() {
    calculateScores();
    assessmentScreen.classList.remove('active');
    resultsScreen.classList.add('active');
    displayResults();
}

function calculateScores() {
    categoryScores = {};
    categories.forEach(category => {
        categoryScores[category] = [];
    });
    
    questions.forEach(q => {
        const answer = answers[q.id];
        if (answer !== undefined) {
            let normalizedScore;
            
            if (q.responseType === 'open-ended' || (q.type === 'scenario' && QUESTION_TYPE_CONFIG.responseType === 'open-ended')) {
                // For open-ended responses, evaluate them
                // Note: This is called synchronously in calculateScores, so we use keyword evaluation
                // AI evaluation would require making calculateScores async, which affects the UI flow
                normalizedScore = evaluateWithKeywords(q, answer);
            } else if (q.type === 'rating') {
                normalizedScore = Math.round((answer / 5) * 4);
                if (normalizedScore === 0) normalizedScore = 1;
            } else {
                normalizedScore = answer;
            }
            
            categoryScores[q.category].push(normalizedScore);
        }
    });
}

// Evaluate open-ended response using AI (if enabled) or keyword matching (fallback)
async function evaluateOpenEndedResponse(question, responseText) {
    // Try AI evaluation if enabled and API key is available
    if (AI_EVALUATION_ENABLED) {
        const apiKey = OPENAI_API_KEY || (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY);
        if (apiKey) {
            try {
                console.log(`🤖 Using AI evaluation (${OPENAI_MODEL}) for question ${question.id}`);
                const aiScore = await evaluateWithAI(question, responseText, apiKey);
                if (aiScore !== null) {
                    console.log(`✅ AI evaluation complete: Score ${aiScore}/3 (${RUBRIC_LEVELS[aiScore].label})`);
                    // Store evaluation for feedback with expanded rubric information
                    const rubricLevel = RUBRIC_LEVELS[aiScore];
                    questionFeedback[question.id] = {
                        level: aiScore,
                        label: rubricLevel.label,
                        description: rubricLevel.description,
                        rubric: question.rubric ? question.rubric[aiScore] : null,
                        feedback: rubricLevel.feedback,
                        responseText: responseText,
                        indicators: rubricLevel.indicators || [],
                        recommendations: rubricLevel.recommendations || [],
                        nextSteps: rubricLevel.nextSteps || '',
                        examples: rubricLevel.examples || [],
                        evaluationMethod: 'AI', // Track that AI was used
                        model: OPENAI_MODEL
                    };
                    return aiScore;
                }
            } catch (error) {
                console.warn('⚠️ AI evaluation failed, falling back to keyword matching:', error);
                // Fall through to keyword matching
            }
        } else {
            console.log('ℹ️ AI evaluation enabled but no API key found, using keyword matching');
        }
    } else {
        console.log('ℹ️ AI evaluation disabled, using keyword matching');
    }
    
    // Fallback to keyword-based evaluation
    console.log(`📝 Using keyword-based evaluation for question ${question.id}`);
    const keywordScore = evaluateWithKeywords(question, responseText);
    console.log(`✅ Keyword evaluation complete: Score ${keywordScore}/3 (${RUBRIC_LEVELS[keywordScore].label})`);
    return keywordScore;
}

// AI-based evaluation using OpenAI API
async function evaluateWithAI(question, responseText, apiKey) {
    try {
        // Build the evaluation prompt
        const rubricLevel1 = RUBRIC_LEVELS[1];
        const rubricLevel2 = RUBRIC_LEVELS[2];
        const rubricLevel3 = RUBRIC_LEVELS[3];
        
        const prompt = `You are evaluating a professional response to a scenario-based assessment question. 

SCENARIO:
${question.scenario || 'N/A'}

QUESTION:
${question.question}

RESPONSE TO EVALUATE:
${responseText}

EVALUATION RUBRIC:

Level 1 - Not Competent:
Description: ${rubricLevel1.description}
Key Indicators: ${rubricLevel1.indicators.join('; ')}
Examples: ${rubricLevel1.examples.join('; ')}

Level 2 - Approaching Competency:
Description: ${rubricLevel2.description}
Key Indicators: ${rubricLevel2.indicators.join('; ')}
Examples: ${rubricLevel2.examples.join('; ')}

Level 3 - Competent:
Description: ${rubricLevel3.description}
Key Indicators: ${rubricLevel3.indicators.join('; ')}
Examples: ${rubricLevel3.examples.join('; ')}

${question.rubricCriteria ? `ADDITIONAL CRITERIA:
Level 3: ${question.rubricCriteria.level4 || question.rubricCriteria.level3 || ''}
Level 2: ${question.rubricCriteria.level2 || ''}
Level 1: ${question.rubricCriteria.level1 || ''}` : ''}

TASK:
Evaluate the response and assign a score of 1, 2, or 3 based on the rubric above.
- Score 1 = Not Competent
- Score 2 = Approaching Competency  
- Score 3 = Competent

Respond with ONLY a single number (1, 2, or 3) and nothing else.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert evaluator of professional competency assessments. You evaluate responses based on provided rubrics and return only a numeric score (1, 2, or 3).'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3, // Lower temperature for more consistent scoring
                max_tokens: 10 // Only need a single number
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const scoreText = data.choices[0]?.message?.content?.trim();
        const score = parseInt(scoreText, 10);

        // Validate score is between 1 and 3
        if (score >= 1 && score <= 3) {
            return score;
        } else {
            console.warn(`AI returned invalid score: ${scoreText}, falling back to keyword matching`);
            return null;
        }
    } catch (error) {
        console.error('Error in AI evaluation:', error);
        return null;
    }
}

// Keyword-based evaluation (fallback method)
function evaluateWithKeywords(question, responseText) {
    const text = responseText.toLowerCase();
    
    // Basic evaluation based on keywords and length
    let score = 1;
    
    if (question.rubricCriteria) {
        // Check for level 3 (Competent) indicators
        const level3Keywords = ['comprehensive', 'systematic', 'evidence-based', 'coordinate', 'proactive', 'preventive', 'thorough', 'detailed', 'assess', 'appropriate', 'document', 'communicate', 'implement', 'analyze'];
        const level3Count = level3Keywords.filter(kw => text.includes(kw)).length;
        
        // Check for level 2 (Approaching Competency) indicators
        const level2Keywords = ['monitor', 'inform', 'basic', 'review', 'identify', 'recognize'];
        const level2Count = level2Keywords.filter(kw => text.includes(kw)).length;
        
        // Score based on keywords and response length (3-level system: 1=Not Competent, 2=Approaching, 3=Competent)
        if (text.length > 200 && level3Count >= 4) {
            score = 3; // Competent
        } else if (text.length > 150 && (level3Count >= 2 || level2Count >= 2)) {
            score = 3; // Competent
        } else if (text.length > 50 && (level2Count >= 1 || level3Count >= 1)) {
            score = 2; // Approaching Competency
        } else {
            score = 1; // Not Competent
        }
    } else {
        // Fallback scoring based on length and content (3-level system)
        if (text.length > 200) score = 3; // Competent
        else if (text.length > 100) score = 2; // Approaching Competency
        else if (text.length > 50) score = 2; // Approaching Competency
        else score = 1; // Not Competent
    }
    
    // Store evaluation for feedback with expanded rubric information
    const rubricLevel = RUBRIC_LEVELS[score];
    questionFeedback[question.id] = {
        level: score,
        label: rubricLevel.label,
        description: rubricLevel.description,
        rubric: question.rubric ? question.rubric[score] : null,
        feedback: rubricLevel.feedback,
        responseText: responseText,
        indicators: rubricLevel.indicators || [],
        recommendations: rubricLevel.recommendations || [],
        nextSteps: rubricLevel.nextSteps || '',
        examples: rubricLevel.examples || [],
        evaluationMethod: 'Keyword' // Track that keyword matching was used
    };
    
    return score;
}

function getScoreLabel(score) {
    if (score >= 2.5) return "Competent";
    if (score >= 1.5) return "Approaching Competency";
    return "Not Competent";
}

function displayResults() {
    const resultsSummary = document.getElementById('results-summary');
    const resultsDetails = document.getElementById('results-details');
    const resultsRoleInfo = document.getElementById('results-role-info');
    
    // Display role information
    if (selectedOccupation) {
        resultsRoleInfo.innerHTML = `
            <h3>${selectedOccupation.title}</h3>
            <p>O*NET Code: ${selectedOccupation.code}</p>
        `;
    }
    
    // Calculate scores
    let totalScore = 0;
    let totalQuestions = 0;
    const categoryAverages = {};
    
    Object.keys(categoryScores).forEach(category => {
        const scores = categoryScores[category];
        if (scores.length > 0) {
            const average = scores.reduce((a, b) => a + b, 0) / scores.length;
            categoryAverages[category] = average;
            totalScore += average * scores.length;
            totalQuestions += scores.length;
        }
    });
    
    const overallAverage = totalQuestions > 0 ? (totalScore / totalQuestions) : 0;
    const percentage = ((overallAverage / 4) * 100).toFixed(1);
    
    // Display summary
    resultsSummary.innerHTML = `
        <h3>Overall Score</h3>
        <div class="total-score">${percentage}%</div>
        <div class="score-label">${getScoreLabel(overallAverage)}</div>
    `;
    
    // Display category details with rubric feedback
    resultsDetails.innerHTML = '';
    Object.keys(categoryAverages).forEach(category => {
        const avg = categoryAverages[category];
        const percentage = ((avg / 4) * 100).toFixed(1);
        
        // Get questions for this category
        const categoryQuestions = questions.filter(q => q.category === category);
        const categoryFeedback = categoryQuestions.map(q => questionFeedback[q.id]).filter(f => f);
        
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-result';
        
        let feedbackHTML = '';
        if (categoryFeedback.length > 0) {
            feedbackHTML = '<div class="category-feedback"><h5>Detailed Feedback:</h5><ul>';
            categoryFeedback.forEach(feedback => {
                const responseText = feedback.responseText ? `<div class="response-preview">Your response: "${feedback.responseText.substring(0, 150)}${feedback.responseText.length > 150 ? '...' : ''}"</div>` : '';
                feedbackHTML += `
                    <li class="feedback-item feedback-level-${feedback.level}">
                        <strong>${feedback.label}:</strong> ${feedback.rubric || feedback.description}
                        ${responseText}
                    </li>
                `;
            });
            feedbackHTML += '</ul></div>';
        }
        
        categoryDiv.innerHTML = `
            <h4>${category}</h4>
            <div class="category-score">${percentage}%</div>
            <p>Based on ${categoryScores[category].length} scenario(s)</p>
            ${feedbackHTML}
        `;
        resultsDetails.appendChild(categoryDiv);
    });
}

function restartAssessment() {
    currentQuestionIndex = 0;
    answers = {};
    questionFeedback = {};
    categoryScores = {};
    selectedSkills = [];
    categories.forEach(category => {
        categoryScores[category] = [];
    });
    
    resultsScreen.classList.remove('active');
    roleSelectionScreen.classList.add('active');
}
