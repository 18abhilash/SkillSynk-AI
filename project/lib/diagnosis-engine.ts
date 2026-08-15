export type DiagnosisState = {
  topic: string;
  messages: Array<{ role: 'ai' | 'user'; content: string; concept?: string }>;
  confidence: number;
  questionCount: number;
  testedConcepts: Set<string>;
  conceptScores: Map<string, number>;
  rootCause: string | null;
  weakConcepts: string[];
  strongConcepts: string[];
  knowledgeScore: number;
  skillScore: number;
  status: 'active' | 'completed';
  phase: 'mcq' | 'conversational';
  mcqScore: number;
  mcqCount: number;
  mcqIndex: number;
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'expert';
  attemptNumber: number;
  previousSessionId: string | null;
};

export function createDiagnosisState(topic: string, attemptNumber = 1, previousSessionId: string | null = null): DiagnosisState {
  return {
    topic,
    messages: [],
    confidence: 0,
    questionCount: 0,
    testedConcepts: new Set(),
    conceptScores: new Map(),
    rootCause: null,
    weakConcepts: [],
    strongConcepts: [],
    knowledgeScore: 0,
    skillScore: 0,
    status: 'active',
    phase: 'mcq',
    mcqScore: 0,
    mcqCount: 0,
    mcqIndex: 0,
    difficultyLevel: 'easy',
    attemptNumber,
    previousSessionId,
  };
}

export type MCQQuestion = {
  id: string;
  concept: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'easy' | 'medium';
  hint: string;
};

export type ConversationalQuestion = {
  concept: string;
  question: string;
  difficulty: number;
  prerequisites: string[];
  hint: string;
  level: 'easy' | 'medium' | 'hard' | 'expert';
};

type ConceptBank = {
  [topic: string]: Array<{
    concept: string;
    question: string;
    difficulty: number;
    prerequisites: string[];
    hint: string;
  }>;
};

const CONCEPT_BANK: ConceptBank = {
  'machine learning': [
    { concept: 'Linear Algebra — Matrices', question: 'What is a matrix, and how does it differ from a simple list of numbers?', difficulty: 1, prerequisites: [], hint: 'Think about dimensions and structure' },
    { concept: 'Linear Algebra — Vectors', question: 'Can you explain what a vector is in your own words?', difficulty: 1, prerequisites: [], hint: 'Magnitude and direction' },
    { concept: 'Linear Algebra — Vector Multiplication', question: 'How would you compute the dot product of two vectors?', difficulty: 2, prerequisites: ['Linear Algebra — Vectors'], hint: 'Element-wise multiply then sum' },
    { concept: 'Calculus — Derivatives', question: 'What does a derivative tell you about a function?', difficulty: 2, prerequisites: [], hint: 'Rate of change' },
    { concept: 'Calculus — Gradients', question: 'If a function has multiple inputs, how do you generalize the derivative?', difficulty: 3, prerequisites: ['Calculus — Derivatives', 'Linear Algebra — Vectors'], hint: 'Partial derivatives combined into a vector' },
    { concept: 'Optimization', question: 'What does it mean to minimize a function, and why is this useful in ML?', difficulty: 3, prerequisites: ['Calculus — Gradients'], hint: 'Finding the lowest point' },
    { concept: 'Gradient Descent', question: 'Explain how gradient descent updates parameters step by step.', difficulty: 4, prerequisites: ['Calculus — Gradients', 'Optimization'], hint: 'Step in the negative gradient direction' },
    { concept: 'Linear Regression', question: 'How does linear regression use a loss function to learn weights?', difficulty: 3, prerequisites: ['Linear Algebra — Matrices', 'Calculus — Gradients'], hint: 'Minimize squared error' },
    { concept: 'Neural Networks', question: 'What role does an activation function play in a neural network?', difficulty: 5, prerequisites: ['Gradient Descent'], hint: 'Non-linearity' },
    { concept: 'Overfitting', question: 'What is overfitting and how would you detect it?', difficulty: 3, prerequisites: ['Linear Regression'], hint: 'Training vs validation performance gap' },
  ],
  'data structures': [
    { concept: 'Variables', question: 'What is a variable and what does it store?', difficulty: 1, prerequisites: [], hint: 'Named storage' },
    { concept: 'Loops', question: 'Explain the difference between a for loop and a while loop.', difficulty: 1, prerequisites: ['Variables'], hint: 'Known vs unknown iteration count' },
    { concept: 'Functions', question: 'Why do we use functions in programming?', difficulty: 2, prerequisites: ['Variables'], hint: 'Reuse and abstraction' },
    { concept: 'Arrays', question: 'How is an array different from a single variable?', difficulty: 2, prerequisites: ['Variables', 'Loops'], hint: 'Collections' },
    { concept: 'Recursion', question: 'What two things must every recursive function have?', difficulty: 3, prerequisites: ['Functions'], hint: 'Base case and recursive case' },
    { concept: 'Trees', question: 'What makes a binary search tree different from a regular tree?', difficulty: 4, prerequisites: ['Recursion'], hint: 'Ordering property' },
    { concept: 'Graphs', question: 'How would you represent a graph in code?', difficulty: 4, prerequisites: ['Recursion'], hint: 'Adjacency list or matrix' },
    { concept: 'Dynamic Programming', question: 'What is optimal substructure and why does it matter for DP?', difficulty: 5, prerequisites: ['Recursion'], hint: 'Solutions to subproblems' },
  ],
  python: [
    { concept: 'Variables', question: 'In Python, what happens when you assign a list to a new variable?', difficulty: 1, prerequisites: [], hint: 'References vs copies' },
    { concept: 'Data Types', question: 'What are the main built-in data types in Python?', difficulty: 1, prerequisites: [], hint: 'int, str, list, dict...' },
    { concept: 'Loops', question: 'How does a Python for loop differ from iterating with an index?', difficulty: 2, prerequisites: ['Variables'], hint: 'Iterables' },
    { concept: 'Functions', question: 'What is the difference between args and kwargs in Python?', difficulty: 2, prerequisites: ['Variables'], hint: 'Positional vs keyword' },
    { concept: 'List Comprehensions', question: 'Rewrite a for loop as a list comprehension — what changes?', difficulty: 3, prerequisites: ['Loops', 'Functions'], hint: 'Concise syntax' },
    { concept: 'Classes', question: 'Explain the difference between a class and an instance.', difficulty: 3, prerequisites: ['Functions'], hint: 'Blueprint vs object' },
    { concept: 'Decorators', question: 'What problem does a decorator solve in Python?', difficulty: 4, prerequisites: ['Classes', 'Functions'], hint: 'Wrapping functions' },
    { concept: 'Generators', question: 'How does a generator differ from a regular function?', difficulty: 4, prerequisites: ['Functions'], hint: 'yield vs return' },
  ],
  sql: [
    { concept: 'Tables', question: 'What does a row in a database table represent?', difficulty: 1, prerequisites: [], hint: 'A single record' },
    { concept: 'SELECT', question: 'What does SELECT * FROM users return?', difficulty: 1, prerequisites: ['Tables'], hint: 'All columns, all rows' },
    { concept: 'WHERE', question: 'How would you filter rows to only include active users?', difficulty: 2, prerequisites: ['SELECT'], hint: 'Condition filtering' },
    { concept: 'JOIN', question: 'Explain the difference between INNER JOIN and LEFT JOIN.', difficulty: 3, prerequisites: ['SELECT'], hint: 'Matching vs preserving' },
    { concept: 'GROUP BY', question: 'What does GROUP BY do and what must accompany it?', difficulty: 3, prerequisites: ['SELECT'], hint: 'Aggregation' },
    { concept: 'Subqueries', question: 'When would you use a subquery instead of a JOIN?', difficulty: 4, prerequisites: ['JOIN'], hint: 'Intermediate results' },
    { concept: 'Indexes', question: 'How does a database index speed up queries?', difficulty: 4, prerequisites: ['SELECT'], hint: 'Like a book index' },
    { concept: 'Window Functions', question: 'What does ROW_NUMBER() OVER (PARTITION BY ...) do?', difficulty: 5, prerequisites: ['GROUP BY'], hint: 'Ranking within groups' },
  ],
  react: [
    { concept: 'Components', question: 'What is a React component and why do we use them?', difficulty: 1, prerequisites: [], hint: 'Reusable UI pieces' },
    { concept: 'Props', question: 'How do you pass data from a parent to a child component?', difficulty: 1, prerequisites: ['Components'], hint: 'Props' },
    { concept: 'State', question: 'What happens when you call a state setter function?', difficulty: 2, prerequisites: ['Components'], hint: 'Re-render' },
    { concept: 'useEffect', question: 'When does the useEffect callback run?', difficulty: 3, prerequisites: ['State'], hint: 'After render, based on deps' },
    { concept: 'Conditional Rendering', question: 'How do you show different UI based on a condition?', difficulty: 2, prerequisites: ['Components'], hint: 'Ternary or &&' },
    { concept: 'Lists and Keys', question: 'Why does React need a key prop on list items?', difficulty: 3, prerequisites: ['Components'], hint: 'Identity and reconciliation' },
    { concept: 'Context', question: 'What problem does React Context solve?', difficulty: 4, prerequisites: ['Props'], hint: 'Prop drilling' },
    { concept: 'Custom Hooks', question: 'When should you extract logic into a custom hook?', difficulty: 4, prerequisites: ['useEffect'], hint: 'Reusable stateful logic' },
  ],
  statistics: [
    { concept: 'Mean and Median', question: 'When is the median a better measure than the mean?', difficulty: 1, prerequisites: [], hint: 'Outliers' },
    { concept: 'Variance', question: 'What does variance tell you about a dataset?', difficulty: 2, prerequisites: ['Mean and Median'], hint: 'Spread' },
    { concept: 'Standard Deviation', question: 'How is standard deviation related to variance?', difficulty: 2, prerequisites: ['Variance'], hint: 'Square root' },
    { concept: 'Probability Distributions', question: 'What is the difference between discrete and continuous distributions?', difficulty: 3, prerequisites: [], hint: 'Countable vs uncountable' },
    { concept: 'Hypothesis Testing', question: 'What does a p-value actually represent?', difficulty: 4, prerequisites: ['Probability Distributions'], hint: 'Probability of observed data under null' },
    { concept: 'Confidence Intervals', question: 'How do you interpret a 95% confidence interval?', difficulty: 4, prerequisites: ['Hypothesis Testing'], hint: 'Long-run frequency' },
    { concept: 'Bayesian Inference', question: 'How does Bayesian thinking differ from frequentist statistics?', difficulty: 5, prerequisites: ['Hypothesis Testing'], hint: 'Prior + evidence = posterior' },
  ],
  'system design': [
    { concept: 'Load Balancing', question: 'Why do we need load balancers in a distributed system?', difficulty: 2, prerequisites: [], hint: 'Distribute traffic' },
    { concept: 'Caching', question: 'Where would you place a cache and what would you cache?', difficulty: 3, prerequisites: [], hint: 'Reduce latency' },
    { concept: 'Database Sharding', question: 'How does sharding differ from replication?', difficulty: 4, prerequisites: [], hint: 'Horizontal vs vertical scaling' },
    { concept: 'Message Queues', question: 'What problem does a message queue solve in a system?', difficulty: 3, prerequisites: [], hint: 'Decoupling and async' },
    { concept: 'CDN', question: 'How does a CDN reduce load on your origin servers?', difficulty: 3, prerequisites: ['Caching'], hint: 'Edge caching' },
    { concept: 'CAP Theorem', question: 'Explain the trade-offs in the CAP theorem.', difficulty: 5, prerequisites: ['Database Sharding'], hint: 'Consistency, Availability, Partition tolerance' },
    { concept: 'Rate Limiting', question: 'How would you implement rate limiting for a public API?', difficulty: 4, prerequisites: ['Load Balancing'], hint: 'Token bucket or sliding window' },
  ],
  algorithms: [
    { concept: 'Big-O Notation', question: 'What does O(n) mean and how does it differ from O(n²)?', difficulty: 2, prerequisites: [], hint: 'Growth rate' },
    { concept: 'Sorting', question: 'Explain how quicksort works at a high level.', difficulty: 3, prerequisites: ['Big-O Notation'], hint: 'Divide and conquer' },
    { concept: 'Binary Search', question: 'What precondition must be true for binary search to work?', difficulty: 2, prerequisites: ['Big-O Notation'], hint: 'Sorted data' },
    { concept: 'Graph Traversal', question: 'What is the difference between BFS and DFS?', difficulty: 3, prerequisites: [], hint: 'Queue vs stack' },
    { concept: 'Dynamic Programming', question: 'When should you use memoization vs tabulation?', difficulty: 5, prerequisites: ['Big-O Notation'], hint: 'Top-down vs bottom-up' },
    { concept: 'Greedy Algorithms', question: 'What makes an algorithm greedy and when does it fail?', difficulty: 4, prerequisites: ['Big-O Notation'], hint: 'Local optimum vs global' },
  ],
};

const DEFAULT_BANK: ConceptBank['default'] = [
  { concept: 'Fundamentals', question: 'Can you explain the core idea of this topic in your own words?', difficulty: 1, prerequisites: [], hint: 'Start simple' },
  { concept: 'Key Terminology', question: 'What are the most important terms someone needs to know here?', difficulty: 2, prerequisites: ['Fundamentals'], hint: 'Vocabulary' },
  { concept: 'Common Patterns', question: 'What patterns or approaches are most frequently used?', difficulty: 3, prerequisites: ['Key Terminology'], hint: 'Repeated techniques' },
  { concept: 'Edge Cases', question: 'What are the tricky edge cases people miss?', difficulty: 4, prerequisites: ['Common Patterns'], hint: 'Boundaries' },
  { concept: 'Real-World Application', question: 'How would you apply this to solve a real problem?', difficulty: 4, prerequisites: ['Common Patterns'], hint: 'Practical use' },
];

const MCQ_BANK: Record<string, MCQQuestion[]> = {
  'machine learning': [
    { id: 'ml1', concept: 'Linear Algebra — Matrices', question: 'What is a matrix?', options: ['A single number', 'A rectangular array of numbers arranged in rows and columns', 'A type of neural network', 'A programming language'], correctIndex: 1, difficulty: 'easy', hint: 'Think about structure' },
    { id: 'ml2', concept: 'Linear Algebra — Vectors', question: 'Which best describes a vector?', options: ['A scalar value', 'A list of databases', 'A quantity with magnitude and direction', 'A type of loop'], correctIndex: 2, difficulty: 'easy', hint: 'Magnitude and direction' },
    { id: 'ml3', concept: 'Calculus — Derivatives', question: 'A derivative measures:', options: ['Area under a curve', 'Rate of change of a function', 'Total value of a function', 'Number of parameters'], correctIndex: 1, difficulty: 'easy', hint: 'Rate of change' },
    { id: 'ml4', concept: 'Gradient Descent', question: 'Gradient descent updates parameters by moving in which direction?', options: ['The positive gradient direction', 'The negative gradient direction', 'A random direction', 'No direction'], correctIndex: 1, difficulty: 'medium', hint: 'Downhill' },
    { id: 'ml5', concept: 'Overfitting', question: 'Overfitting means the model:', options: ['Performs well on training but poorly on new data', 'Performs poorly on all data', 'Has too few parameters', 'Cannot be trained'], correctIndex: 0, difficulty: 'medium', hint: 'Generalization gap' },
  ],
  'data structures': [
    { id: 'ds1', concept: 'Variables', question: 'What does a variable store?', options: ['A function', 'A value or reference to data', 'A class', 'A network'], correctIndex: 1, difficulty: 'easy', hint: 'Named storage' },
    { id: 'ds2', concept: 'Loops', question: 'A for loop is best used when:', options: ['You do not know how many times to iterate', 'You know the iteration count in advance', 'You never need loops', 'You only need one iteration'], correctIndex: 1, difficulty: 'easy', hint: 'Known count' },
    { id: 'ds3', concept: 'Functions', question: 'Functions are primarily used for:', options: ['Code reuse and abstraction', 'Slowing down programs', 'Storing data permanently', 'Network requests only'], correctIndex: 0, difficulty: 'easy', hint: 'Reuse' },
    { id: 'ds4', concept: 'Recursion', question: 'Every recursive function must have:', options: ['A loop', 'A base case and a recursive case', 'A global variable', 'No return statement'], correctIndex: 1, difficulty: 'medium', hint: 'Base + recursive' },
    { id: 'ds5', concept: 'Trees', question: 'A binary search tree maintains which property?', options: ['Left child > parent, right child < parent', 'Left child < parent < right child', 'All children equal parent', 'No ordering'], correctIndex: 1, difficulty: 'medium', hint: 'Ordering' },
  ],
  python: [
    { id: 'py1', concept: 'Variables', question: 'In Python, assigning a list creates a:', options: ['Deep copy', 'Reference to the same object', 'New type', 'Tuple'], correctIndex: 1, difficulty: 'easy', hint: 'References' },
    { id: 'py2', concept: 'Data Types', question: 'Which is NOT a built-in Python data type?', options: ['int', 'str', 'list', 'matrix'], correctIndex: 3, difficulty: 'easy', hint: 'Not built-in' },
    { id: 'py3', concept: 'Loops', question: 'Python for loops iterate over:', options: ['Only numbers', 'Iterables', 'Only strings', 'Only files'], correctIndex: 1, difficulty: 'easy', hint: 'Iterables' },
    { id: 'py4', concept: 'Functions', question: 'kwargs allows you to pass:', options: ['Only positional arguments', 'Keyword arguments as a dictionary', 'No arguments', 'Only integers'], correctIndex: 1, difficulty: 'medium', hint: 'Keyword args' },
    { id: 'py5', concept: 'Generators', question: 'Generators use which keyword instead of return?', options: ['yield', 'give', 'produce', 'output'], correctIndex: 0, difficulty: 'medium', hint: 'yield' },
  ],
  sql: [
    { id: 'sq1', concept: 'Tables', question: 'A row in a database table represents:', options: ['A column header', 'A single record or entity', 'A query', 'An index'], correctIndex: 1, difficulty: 'easy', hint: 'A record' },
    { id: 'sq2', concept: 'SELECT', question: 'SELECT * FROM users returns:', options: ['Only the first user', 'All columns and all rows', 'No rows', 'Only column names'], correctIndex: 1, difficulty: 'easy', hint: 'Everything' },
    { id: 'sq3', concept: 'WHERE', question: 'The WHERE clause is used to:', options: ['Sort results', 'Filter rows matching a condition', 'Join tables', 'Group data'], correctIndex: 1, difficulty: 'easy', hint: 'Filtering' },
    { id: 'sq4', concept: 'JOIN', question: 'A LEFT JOIN returns:', options: ['Only matching rows', 'All rows from the left table plus matches', 'No rows', 'Only right table rows'], correctIndex: 1, difficulty: 'medium', hint: 'Left preserved' },
    { id: 'sq5', concept: 'GROUP BY', question: 'GROUP BY is used with:', options: ['Aggregate functions', 'DELETE statements', 'INSERT only', 'No function'], correctIndex: 0, difficulty: 'medium', hint: 'Aggregation' },
  ],
  react: [
    { id: 're1', concept: 'Components', question: 'A React component is:', options: ['A database table', 'A reusable UI piece returning JSX', 'A CSS file', 'A server'], correctIndex: 1, difficulty: 'easy', hint: 'Reusable UI' },
    { id: 're2', concept: 'Props', question: 'Props are used to:', options: ['Pass data from parent to child', 'Store server data', 'Define CSS', 'Create databases'], correctIndex: 0, difficulty: 'easy', hint: 'Parent to child' },
    { id: 're3', concept: 'State', question: 'Calling a state setter function:', options: ['Does nothing', 'Triggers a re-render', 'Deletes the component', 'Stops the app'], correctIndex: 1, difficulty: 'easy', hint: 'Re-render' },
    { id: 're4', concept: 'useEffect', question: 'useEffect runs:', options: ['Before render', 'After render based on dependencies', 'Never', 'Only on mount'], correctIndex: 1, difficulty: 'medium', hint: 'After render' },
    { id: 're5', concept: 'Lists and Keys', question: 'React needs keys on list items for:', options: ['Styling', 'Identity and reconciliation', 'Sorting', 'No reason'], correctIndex: 1, difficulty: 'medium', hint: 'Identity' },
  ],
  statistics: [
    { id: 'st1', concept: 'Mean and Median', question: 'The median is better than the mean when:', options: ['Data is perfectly symmetric', 'Data has outliers', 'Data is categorical', 'There is no data'], correctIndex: 1, difficulty: 'easy', hint: 'Outliers' },
    { id: 'st2', concept: 'Variance', question: 'Variance measures:', options: ['Central tendency', 'Spread of data', 'Probability', 'Sample size'], correctIndex: 1, difficulty: 'easy', hint: 'Spread' },
    { id: 'st3', concept: 'Standard Deviation', question: 'Standard deviation is:', options: ['The square of variance', 'The square root of variance', 'Unrelated to variance', 'The mean'], correctIndex: 1, difficulty: 'easy', hint: 'Square root' },
    { id: 'st4', concept: 'Hypothesis Testing', question: 'A p-value represents:', options: ['The probability the hypothesis is true', 'The probability of observed data under the null hypothesis', 'The sample mean', 'The variance'], correctIndex: 1, difficulty: 'medium', hint: 'Under null' },
    { id: 'st5', concept: 'Bayesian Inference', question: 'Bayesian inference combines:', options: ['Prior and evidence to get posterior', 'Only data', 'Only prior', 'Nothing'], correctIndex: 0, difficulty: 'medium', hint: 'Prior + evidence' },
  ],
  'system design': [
    { id: 'sd1', concept: 'Load Balancing', question: 'Load balancers are used to:', options: ['Store data', 'Distribute traffic across servers', 'Compile code', 'Send emails'], correctIndex: 1, difficulty: 'easy', hint: 'Distribute traffic' },
    { id: 'sd2', concept: 'Caching', question: 'A cache is used to:', options: ['Slow down requests', 'Reduce latency by storing frequent data', 'Delete data', 'Encrypt traffic'], correctIndex: 1, difficulty: 'easy', hint: 'Reduce latency' },
    { id: 'sd3', concept: 'Message Queues', question: 'Message queues help with:', options: ['Decoupling and async processing', 'UI rendering', 'Data encryption', 'File storage'], correctIndex: 0, difficulty: 'medium', hint: 'Decoupling' },
    { id: 'sd4', concept: 'CAP Theorem', question: 'CAP stands for:', options: ['Consistency, Availability, Partition tolerance', 'Cache, API, Protocol', 'Compute, Access, Process', 'Create, Apply, Publish'], correctIndex: 0, difficulty: 'medium', hint: 'Three properties' },
    { id: 'sd5', concept: 'CDN', question: 'A CDN reduces load by:', options: ['Caching content at edge locations', 'Adding more databases', 'Slowing requests', 'Removing servers'], correctIndex: 0, difficulty: 'medium', hint: 'Edge caching' },
  ],
  algorithms: [
    { id: 'al1', concept: 'Big-O Notation', question: 'O(n) represents:', options: ['Constant time', 'Linear time', 'Quadratic time', 'Exponential time'], correctIndex: 1, difficulty: 'easy', hint: 'Linear' },
    { id: 'al2', concept: 'Binary Search', question: 'Binary search requires:', options: ['Unsorted data', 'Sorted data', 'A graph', 'A tree'], correctIndex: 1, difficulty: 'easy', hint: 'Sorted' },
    { id: 'al3', concept: 'Sorting', question: 'Quicksort uses which strategy?', options: ['Dynamic programming', 'Divide and conquer', 'Greedy', 'Brute force'], correctIndex: 1, difficulty: 'medium', hint: 'Divide and conquer' },
    { id: 'al4', concept: 'Graph Traversal', question: 'BFS uses which data structure?', options: ['Stack', 'Queue', 'Heap', 'Tree'], correctIndex: 1, difficulty: 'medium', hint: 'Queue' },
    { id: 'al5', concept: 'Dynamic Programming', question: 'DP requires which property?', options: ['Random access', 'Optimal substructure', 'Sorted data', 'Circular references'], correctIndex: 1, difficulty: 'medium', hint: 'Subproblems' },
  ],
};

const DEFAULT_MCQ: MCQQuestion[] = [
  { id: 'def1', concept: 'Fundamentals', question: 'What best describes this topic?', options: ['A programming language', 'A core concept with key principles', 'A database', 'A framework'], correctIndex: 1, difficulty: 'easy', hint: 'Core concept' },
  { id: 'def2', concept: 'Key Terminology', question: 'Why is terminology important?', options: ['It is not important', 'It provides shared vocabulary for communication', 'It slows learning', 'It replaces practice'], correctIndex: 1, difficulty: 'easy', hint: 'Communication' },
  { id: 'def3', concept: 'Common Patterns', question: 'Patterns help you:', options: ['Memorize everything', 'Recognize and solve problems faster', 'Avoid learning', 'Write longer code'], correctIndex: 1, difficulty: 'easy', hint: 'Faster solving' },
  { id: 'def4', concept: 'Edge Cases', question: 'Edge cases are:', options: ['Rare situations that can break solutions', 'Always irrelevant', 'Only in databases', 'A type of loop'], correctIndex: 0, difficulty: 'medium', hint: 'Boundaries' },
  { id: 'def5', concept: 'Real-World Application', question: 'Applying knowledge to real problems requires:', options: ['Only theory', 'Understanding plus practice', 'Nothing', 'Only memorization'], correctIndex: 1, difficulty: 'medium', hint: 'Practice' },
];

const DIFFICULTY_MAP: Record<number, 'easy' | 'medium' | 'hard' | 'expert'> = {
  1: 'easy',
  2: 'easy',
  3: 'medium',
  4: 'hard',
  5: 'expert',
};

const LEVEL_TO_DIFFICULTY: Record<'easy' | 'medium' | 'hard' | 'expert', number[]> = {
  easy: [1, 2],
  medium: [2, 3],
  hard: [3, 4],
  expert: [4, 5],
};

export function getMCQQuestions(topic: string): MCQQuestion[] {
  const normalized = topic.toLowerCase().trim();
  return MCQ_BANK[normalized] ?? DEFAULT_MCQ;
}

export function getConceptBank(topic: string) {
  const normalized = topic.toLowerCase().trim();
  return CONCEPT_BANK[normalized] ?? DEFAULT_BANK;
}

export function isDonKnow(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase();
  return trimmed === "don't know" || trimmed === "dont know" || trimmed === "don't know." || trimmed === "i don't know" || trimmed === 'idk' || trimmed === 'no idea' || trimmed === 'not sure';
}

export function selectNextQuestion(state: DiagnosisState, topic: string): ConversationalQuestion | null {
  const bank = getConceptBank(topic);
  const testedArr = Array.from(state.testedConcepts);
  const allowedDifficulties = LEVEL_TO_DIFFICULTY[state.difficultyLevel];

  for (const item of bank) {
    if (testedArr.includes(item.concept)) continue;
    if (!allowedDifficulties.includes(item.difficulty)) continue;
    const prereqsMet = item.prerequisites.every((p) => testedArr.includes(p));
    if (prereqsMet) {
      return { ...item, level: DIFFICULTY_MAP[item.difficulty] ?? 'medium' };
    }
  }

  for (const item of bank) {
    if (testedArr.includes(item.concept)) continue;
    const prereqsMet = item.prerequisites.every((p) => testedArr.includes(p));
    if (prereqsMet) {
      return { ...item, level: DIFFICULTY_MAP[item.difficulty] ?? 'medium' };
    }
  }

  for (const item of bank) {
    if (!testedArr.includes(item.concept)) {
      return { ...item, level: DIFFICULTY_MAP[item.difficulty] ?? 'medium' };
    }
  }

  return null;
}

export function evaluateAnswer(
  answer: string,
  concept: string,
  hint: string,
): { score: number; feedback: string; confidenceDelta: number } {
  const trimmed = answer.trim().toLowerCase();

  if (isDonKnow(trimmed)) {
    return {
      score: 0,
      feedback: `That's okay — not knowing is just as important as knowing. I'll mark this as a gap and trace back to find the root cause.`,
      confidenceDelta: 5,
    };
  }

  if (trimmed.length < 10) {
    return {
      score: 0,
      feedback: "I'd like to understand your thinking more deeply. Can you elaborate on that?",
      confidenceDelta: 8,
    };
  }

  const words = trimmed.split(/\s+/);
  const uniqueWords = new Set(words.filter((w) => w.length > 3));
  const hasStructure = /because|so that|in order|therefore|which means|allows|enables|due to/.test(trimmed);
  const hasExample = /example|for instance|such as|like|e\.g\./.test(trimmed);
  const mentionsHint = trimmed.includes(hint.toLowerCase().split(' ')[0]);

  let score = 0;
  if (uniqueWords.size >= 8) score += 25;
  else if (uniqueWords.size >= 5) score += 15;
  else score += 5;

  if (hasStructure) score += 25;
  if (hasExample) score += 20;
  if (mentionsHint) score += 15;
  if (words.length >= 30) score += 15;
  else if (words.length >= 15) score += 10;

  score = Math.min(score, 100);

  let feedback = '';
  let confidenceDelta = 0;

  if (score >= 75) {
    feedback = `Excellent — you clearly understand ${concept.split(' — ')[0]}. Let's go deeper.`;
    confidenceDelta = 12;
  } else if (score >= 50) {
    feedback = `You're on the right track with ${concept.split(' — ')[0]}, but I want to make sure the foundation is solid. Let me probe a related idea.`;
    confidenceDelta = 8;
  } else if (score >= 25) {
    feedback = `There's a gap here around ${concept.split(' — ')[0]}. Let me check an earlier concept to find the root cause.`;
    confidenceDelta = 6;
  } else {
    feedback = `This is a key gap. Let me trace back to find where the understanding breaks down.`;
    confidenceDelta = 5;
  }

  return { score, feedback, confidenceDelta };
}

export function adjustDifficulty(state: DiagnosisState): 'easy' | 'medium' | 'hard' | 'expert' {
  const recentScores = Array.from(state.conceptScores.values()).slice(-3);
  if (recentScores.length === 0) return state.difficultyLevel;

  const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  if (avg >= 65) {
    if (state.difficultyLevel === 'easy') return 'medium';
    if (state.difficultyLevel === 'medium') return 'hard';
    if (state.difficultyLevel === 'hard') return 'expert';
    return 'expert';
  } else {
    return state.difficultyLevel;
  }
}

export function computeRootCause(state: DiagnosisState, topic: string): string | null {
  const bank = getConceptBank(topic);
  const weak = bank.filter((b) => {
    const s = state.conceptScores.get(b.concept);
    return s !== undefined && s < 50;
  });

  if (weak.length === 0) return null;

  const mostFundamental = weak.sort((a, b) => a.difficulty - b.difficulty)[0];
  return mostFundamental?.concept ?? null;
}

export function generateLearningPlan(
  topic: string,
  rootCause: string | null,
  weakConcepts: string[],
): {
  estimatedDays: number;
  dailyPlan: Array<{ day: number; title: string; tasks: string[] }>;
  weeklyPlan: Array<{ week: number; title: string; goals: string[] }>;
  projects: Array<{ title: string; description: string; difficulty: string }>;
  videos: Array<{ title: string; url: string; duration: string }>;
  books: Array<{ title: string; author: string }>;
  practiceProblems: Array<{ title: string; difficulty: string; url: string }>;
} {
  const estimatedDays = Math.min(Math.max(weakConcepts.length * 3, 7), 60);

  const dailyPlan = Array.from({ length: Math.min(7, estimatedDays) }, (_, i) => ({
    day: i + 1,
    title: i === 0 ? `Start with: ${rootCause ?? weakConcepts[0] ?? 'Fundamentals'}` : `Deepen: ${weakConcepts[i] ?? 'Practice'}`,
    tasks: [
      `Watch an introductory video on ${weakConcepts[i] ?? rootCause ?? 'the topic'}`,
      `Solve 2 practice problems`,
      `Write a short summary in your own words`,
    ],
  }));

  const weeklyPlan = [
    { week: 1, title: 'Foundation Repair', goals: [`Master ${rootCause ?? 'core fundamentals'}`, 'Build mental models', 'Connect prerequisites'] },
    { week: 2, title: 'Concept Integration', goals: ['Connect weak concepts to strong ones', 'Apply to small problems', 'Build confidence'] },
    { week: 3, title: 'Applied Practice', goals: ['Solve real problems', 'Build a mini-project', 'Test understanding'] },
  ];

  const projects = [
    { title: `${topic} — Mini Project`, description: `Build something small that exercises ${weakConcepts.slice(0, 3).join(', ')}`, difficulty: 'intermediate' },
    { title: `${topic} — Integration Project`, description: 'Combine multiple concepts into a single working solution', difficulty: 'advanced' },
  ];

  const videos = [
    { title: `Understanding ${rootCause ?? topic}`, url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${rootCause ?? topic} tutorial`), duration: '15-20 min' },
    { title: `${topic} Deep Dive`, url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${topic} deep dive`), duration: '30-45 min' },
  ];

  const books = [
    { title: `Introduction to ${topic}`, author: 'Recommended Textbook' },
    { title: 'Mathematics for Computing', author: 'Reference Text' },
  ];

  const practiceProblems = weakConcepts.slice(0, 5).map((c, i) => ({
    title: `${c} — Practice Set ${i + 1}`,
    difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard',
    url: '#',
  }));

  return { estimatedDays, dailyPlan, weeklyPlan, projects, videos, books, practiceProblems };
}
