/*
# SkillSphere AI — Companies Update Policy + Seed Data

1. Adds the companies UPDATE policy (depends on company_members existing).
2. Seeds skills and concepts for the knowledge graph.
*/

-- Companies update policy
DROP POLICY IF EXISTS "companies_update_own" ON companies;
CREATE POLICY "companies_update_own" ON companies FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = companies.id AND company_members.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM company_members WHERE company_members.company_id = companies.id AND company_members.user_id = auth.uid())
);

-- Seed skills
INSERT INTO skills (name, slug, category, description, icon_name) VALUES
('Python', 'python', 'Programming', 'General-purpose programming language', 'Code'),
('JavaScript', 'javascript', 'Programming', 'Web programming language', 'Code'),
('SQL', 'sql', 'Database', 'Query language for relational databases', 'Database'),
('Machine Learning', 'machine-learning', 'AI/ML', 'Algorithms that learn from data', 'BrainCircuit'),
('Data Structures', 'data-structures', 'Computer Science', 'Organizing data for efficient access', 'Network'),
('Algorithms', 'algorithms', 'Computer Science', 'Step-by-step procedures for computation', 'GitBranch'),
('System Design', 'system-design', 'Computer Science', 'Designing scalable systems', 'Server'),
('React', 'react', 'Frontend', 'UI library for building web apps', 'Atom'),
('Statistics', 'statistics', 'Mathematics', 'Mathematical study of data', 'Sigma'),
('Linear Algebra', 'linear-algebra', 'Mathematics', 'Vectors, matrices, and linear transformations', 'Grid3x3')
ON CONFLICT (name) DO NOTHING;

-- Seed concepts for Machine Learning (skill)
DO $$
DECLARE
  ml_id uuid;
  la_id uuid;
  stats_id uuid;
  ds_id uuid;
  algo_id uuid;
  concept_rec uuid;
  concept_arr uuid;
  concept_func uuid;
  concept_var uuid;
  concept_loop uuid;
  concept_matrix uuid;
  concept_vector uuid;
  concept_grad uuid;
  concept_deriv uuid;
  concept_calc uuid;
  concept_optim uuid;
BEGIN
  SELECT id INTO ml_id FROM skills WHERE slug = 'machine-learning';
  SELECT id INTO la_id FROM skills WHERE slug = 'linear-algebra';
  SELECT id INTO stats_id FROM skills WHERE slug = 'statistics';
  SELECT id INTO ds_id FROM skills WHERE slug = 'data-structures';
  SELECT id INTO algo_id FROM skills WHERE slug = 'algorithms';

  -- Linear Algebra concepts
  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (la_id, 'Matrices', 'Rectangular arrays of numbers', 2, 'understand', '{}')
  RETURNING id INTO concept_matrix;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (la_id, 'Vectors', 'Quantities with magnitude and direction', 1, 'remember', '{}')
  RETURNING id INTO concept_vector;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (la_id, 'Vector Multiplication', 'Dot and cross products', 2, 'apply', ARRAY[concept_vector]);

  -- Calculus concepts (under ML)
  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ml_id, 'Derivatives', 'Rate of change of a function', 3, 'apply', '{}')
  RETURNING id INTO concept_deriv;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ml_id, 'Calculus Fundamentals', 'Limits, continuity, derivatives', 2, 'understand', '{}')
  RETURNING id INTO concept_calc;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ml_id, 'Gradients', 'Vector of partial derivatives', 3, 'apply', ARRAY[concept_deriv, concept_vector])
  RETURNING id INTO concept_grad;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ml_id, 'Optimization', 'Finding minima/maxima of functions', 4, 'analyze', ARRAY[concept_grad])
  RETURNING id INTO concept_optim;

  -- ML concepts
  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ml_id, 'Linear Regression', 'Predicting values with a linear model', 3, 'apply', ARRAY[concept_matrix, concept_grad]);

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ml_id, 'Gradient Descent', 'Iterative optimization algorithm', 4, 'analyze', ARRAY[concept_grad, concept_optim]);

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ml_id, 'Neural Networks', 'Layers of neurons with activation functions', 5, 'create', ARRAY[concept_grad, concept_optim]);

  -- Programming concepts (under Data Structures)
  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Variables', 'Named storage for data', 1, 'remember', '{}')
  RETURNING id INTO concept_var;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Loops', 'Repeated execution of code', 1, 'understand', ARRAY[concept_var])
  RETURNING id INTO concept_loop;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Functions', 'Reusable blocks of code', 2, 'apply', ARRAY[concept_var])
  RETURNING id INTO concept_func;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Arrays', 'Ordered collections of elements', 2, 'apply', ARRAY[concept_var, concept_loop])
  RETURNING id INTO concept_arr;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Recursion', 'Functions that call themselves', 3, 'apply', ARRAY[concept_func])
  RETURNING id INTO concept_rec;

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Trees', 'Hierarchical data structures', 4, 'analyze', ARRAY[concept_rec]);

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Graphs', 'Nodes connected by edges', 4, 'analyze', ARRAY[concept_rec]);

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (ds_id, 'Dynamic Programming', 'Optimal substructure problems', 5, 'create', ARRAY[concept_rec]);

  -- Algorithm concepts
  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (algo_id, 'Sorting', 'Arranging elements in order', 2, 'apply', ARRAY[concept_arr]);

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (algo_id, 'Searching', 'Finding elements in data', 2, 'apply', ARRAY[concept_arr]);

  INSERT INTO concepts (skill_id, name, description, difficulty, bloom_level, prerequisite_ids)
  VALUES (algo_id, 'Big-O Analysis', 'Time and space complexity', 3, 'analyze', '{}');
END $$;
