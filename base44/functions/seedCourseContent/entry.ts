import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COURSES = [
  { code: 'AP_CALC_AB', name: 'AP Calculus AB', color: '#2563EB', icon: 'AB', description: 'Limits, derivatives, integrals, differential equations, and applications of calculus.', units: [
    [1, 'Limits and Continuity', '10-12%', ['Introducing Calculus: Can Change Occur at an Instant?', 'Defining Limits and Using Limit Notation', 'Estimating Limit Values from Graphs', 'Estimating Limit Values from Tables', 'Determining Limits Using Algebraic Properties', 'Determining Limits Using Algebraic Manipulation', 'Selecting Procedures for Determining Limits', 'Determining Limits Using the Squeeze Theorem', 'Connecting Multiple Representations of Limits', 'Exploring Types of Discontinuities', 'Defining Continuity at a Point', 'Confirming Continuity over an Interval', 'Removing Discontinuities', 'Connecting Infinite Limits and Vertical Asymptotes', 'Connecting Limits at Infinity and Horizontal Asymptotes', 'Working with the Intermediate Value Theorem']],
    [2, 'Differentiation: Definition and Fundamental Properties', '10-12%', ['Defining Average and Instantaneous Rates of Change', 'Defining the Derivative of a Function', 'Estimating Derivatives', 'Connecting Differentiability and Continuity', 'The Power Rule', 'Derivative Rules: Constant, Sum, Difference, and Constant Multiple', 'Derivatives of sin x, cos x, e^x, and ln x', 'The Product Rule', 'The Quotient Rule', 'Derivatives of tan x, cot x, sec x, and csc x', 'Selecting Procedures for Calculating Derivatives', 'Higher-Order Derivatives']],
    [3, 'Differentiation: Composite, Implicit, and Inverse Functions', '9-13%', ['The Chain Rule', 'Implicit Differentiation', 'Differentiating Inverse Functions', 'Differentiating Inverse Trigonometric Functions', 'Selecting Procedures for Differentiation', 'Calculating Higher-Order Derivatives']],
    [4, 'Contextual Applications of Differentiation', '10-15%', ['Interpreting the Meaning of the Derivative in Context', 'Straight-Line Motion', 'Rates of Change in Applied Contexts Other Than Motion', 'Introduction to Related Rates', 'Solving Related Rates Problems', 'Approximating Values Using Local Linearity and Linearization', "Using L'Hospital's Rule"]],
    [5, 'Analytical Applications of Differentiation', '15-18%', ['Using the Mean Value Theorem', 'Extreme Value Theorem, Global Extrema, and Local Extrema', 'Determining Intervals on Which a Function Is Increasing or Decreasing', 'Using the First Derivative Test', 'Using the Candidates Test', 'Determining Concavity of Functions', 'Using the Second Derivative Test', 'Sketching Graphs of Functions and Their Derivatives', 'Connecting a Function, Its First Derivative, and Its Second Derivative', 'Solving Optimization Problems', 'Exploring Behaviors of Implicit Relations']],
    [6, 'Integration and Accumulation of Change', '17-20%', ['Exploring Accumulations of Change', 'Approximating Areas with Riemann Sums', 'Riemann Sums, Summation Notation, and Definite Integral Notation', 'The Fundamental Theorem of Calculus and Accumulation Functions', 'Interpreting the Behavior of Accumulation Functions', 'Applying Properties of Definite Integrals', 'The Fundamental Theorem of Calculus and Definite Integrals', 'Finding Antiderivatives and Indefinite Integrals', 'Integrating Using Substitution', 'Integrating Functions Using Long Division and Completing the Square']],
    [7, 'Differential Equations', '6-12%', ['Modeling Situations with Differential Equations', 'Verifying Solutions for Differential Equations', 'Sketching Slope Fields', 'Reasoning Using Slope Fields', "Euler's Method", 'General Solutions Using Separation of Variables', 'Particular Solutions Using Initial Conditions', 'Exponential Models with Differential Equations']],
    [8, 'Applications of Integration', '10-15%', ['Average Value of a Function on an Interval', 'Connecting Position, Velocity, and Acceleration Using Integrals', 'Using Accumulation Functions in Applied Contexts', 'Finding the Area Between Curves Expressed as Functions of x', 'Finding the Area Between Curves Expressed as Functions of y', 'Volumes with Cross Sections', 'Volumes with the Disc Method', 'Volumes with the Washer Method']]
  ] },
  { code: 'AP_CALC_BC', name: 'AP Calculus BC', color: '#7C3AED', icon: 'BC', description: 'AP Calculus AB topics plus parametric, polar, vector-valued functions, and infinite series.', extends: 'AP_CALC_AB', extraUnits: [
    [9, 'Parametric Equations, Polar Coordinates, and Vector-Valued Functions', '11-12%', ['Defining and Differentiating Parametric Equations', 'Second Derivatives of Parametric Equations', 'Finding Arc Lengths of Curves Given by Parametric Equations', 'Defining and Differentiating Vector-Valued Functions', 'Integrating Vector-Valued Functions', 'Solving Motion Problems Using Parametric and Vector-Valued Functions', 'Defining Polar Coordinates and Differentiating in Polar Form', 'Finding Areas of Polar Regions', 'Finding Arc Lengths of Polar Curves']],
    [10, 'Infinite Sequences and Series', '17-18%', ['Defining Convergent and Divergent Infinite Series', 'Working with Geometric Series', 'The nth Term Test', 'Integral Test', 'Harmonic Series and p-Series', 'Comparison Tests', 'Alternating Series Test', 'Ratio Test', 'Determining Absolute or Conditional Convergence', 'Alternating Series Error Bound', 'Finding Taylor Polynomial Approximations', 'Lagrange Error Bound', 'Radius and Interval of Convergence', 'Representing Functions as Power Series', 'Maclaurin Series for Common Functions', 'Taylor Series']]
  ] },
  { code: 'AP_PHYSICS_1', name: 'AP Physics 1', color: '#DC2626', icon: 'P1', description: 'Algebra-based mechanics with fluids included in the current AP Physics 1 framework.', units: [[1,'Kinematics','10-15%',['Position, Velocity, and Acceleration','Representations of Motion','Reference Frames and Relative Motion','Motion in Two Dimensions']],[2,'Force and Translational Dynamics','18-23%',['Systems and Center of Mass','Forces and Free-Body Diagrams',"Newton's Third Law","Newton's First Law","Newton's Second Law",'Gravitational Force','Kinetic and Static Friction','Spring Forces','Circular Motion']],[3,'Work, Energy, and Power','18-23%',['Translational Kinetic Energy','Work','Potential Energy','Conservation of Energy','Power']],[4,'Linear Momentum','10-15%',['Linear Momentum','Change in Momentum and Impulse','Conservation of Linear Momentum','Elastic and Inelastic Collisions']],[5,'Torque and Rotational Dynamics','10-15%',['Rotational Kinematics','Connecting Linear and Rotational Motion','Torque','Rotational Inertia',"Rotational Equilibrium and Newton's First Law","Rotational Newton's Second Law"]],[6,'Energy and Momentum of Rotating Systems','5-8%',['Rotational Kinetic Energy','Torque and Work','Angular Momentum and Angular Impulse','Conservation of Angular Momentum']],[7,'Oscillations','5-8%',['Defining Simple Harmonic Motion','Frequency and Period of Simple Harmonic Oscillators','Representing and Analyzing Simple Harmonic Motion','Energy of Simple Harmonic Oscillators']],[8,'Fluids','10-15%',['Internal Structure and Density','Pressure',"Fluids and Newton's Laws",'Fluids and Conservation Laws']]] },
  { code: 'AP_PHYSICS_2', name: 'AP Physics 2', color: '#B91C1C', icon: 'P2', description: 'Algebra-based thermodynamics, electricity and magnetism, optics, waves, and modern physics.', units: [[9,'Thermodynamics','15-20%',['Thermal Systems and State Variables','Pressure, Thermal Equilibrium, and Temperature','Ideal Gas Law','Kinetic Molecular Theory','Internal Energy','Energy Transfer and Thermal Processes','The First Law of Thermodynamics','The Second Law of Thermodynamics','Heat Engines and Refrigerators']],[10,'Electric Force, Field, and Potential','18-22%',['Electric Charge and Electric Force','Electric Fields','Electric Flux','Electric Potential Energy','Electric Potential','Equipotential Lines and Surfaces','Fields and Potentials of Charge Distributions']],[11,'Electric Circuits','18-22%',['Current and Resistance',"Ohm's Law and Electric Power",'Series and Parallel Circuits',"Kirchhoff's Rules",'Capacitors in Circuits','RC Circuits']],[12,'Magnetism and Electromagnetism','10-15%',['Magnetic Fields','Magnetic Forces on Moving Charges','Magnetic Forces on Current-Carrying Wires','Fields of Long Current-Carrying Wires','Electromagnetic Induction',"Faraday's Law and Lenz's Law"]],[13,'Geometric Optics','8-12%',['Reflection',"Refraction and Snell's Law",'Images from Mirrors','Images from Lenses','Ray Diagrams and Optical Instruments']],[14,'Waves, Sound, and Physical Optics','12-16%',['Properties of Waves','Standing Waves and Resonance','Sound Waves','Doppler Effect','Wave Interference','Diffraction','Thin-Film Interference']],[15,'Modern Physics','15-20%',['Photoelectric Effect','Wave-Particle Duality','Atomic Energy Levels','Quantum Transitions','Nuclear Structure','Radioactive Decay','Mass-Energy Equivalence']]] },
  { code: 'AP_PHYSICS_CM', name: 'AP Physics C: Mechanics', color: '#EA580C', icon: 'CM', description: 'Calculus-based mechanics aligned to the current AP Physics C: Mechanics framework.', units: [[1,'Kinematics','10-15%',['Scalars and Vectors','Displacement, Velocity, and Acceleration','Representing Motion','Reference Frames and Relative Motion','Motion in Two Dimensions']],[2,'Force and Translational Dynamics','20-25%',['Systems and Center of Mass','Forces and Free-Body Diagrams',"Newton's Laws of Motion",'Gravitational Force','Friction','Spring Forces','Circular Motion']],[3,'Work, Energy, and Power','15-25%',['Work and Kinetic Energy','Conservative and Nonconservative Forces','Potential Energy','Conservation of Energy','Power']],[4,'Linear Momentum','10-20%',['Linear Momentum','Impulse and Change in Momentum','Conservation of Linear Momentum','Collisions','Center of Mass Motion']],[5,'Torque and Rotational Dynamics','10-15%',['Rotational Kinematics','Torque','Rotational Inertia','Rotational Equilibrium',"Newton's Second Law for Rotation"]],[6,'Energy and Momentum of Rotating Systems','10-15%',['Rotational Kinetic Energy','Work and Power in Rotational Motion','Angular Momentum','Angular Impulse','Conservation of Angular Momentum']],[7,'Oscillations','10-15%',['Simple Harmonic Motion','Springs and Pendulums','Energy in Simple Harmonic Motion','Differential Equations for Oscillations']]] },
  { code: 'AP_PHYSICS_CE', name: 'AP Physics C: E&M', color: '#C026D3', icon: 'EM', description: 'Calculus-based electricity and magnetism aligned to the current AP Physics C: E&M framework.', units: [[8,"Electric Charges, Fields, and Gauss's Law",'15-25%',['Electric Charge and Electric Force','Electric Fields','Electric Flux',"Gauss's Law",'Fields of Charge Distributions','Conductors in Electrostatic Equilibrium']],[9,'Electric Potential','10-20%',['Electric Potential Energy','Electric Potential','Potential from Point Charges and Distributions','Equipotential Surfaces','Relating Electric Field and Electric Potential']],[10,'Conductors and Capacitors','10-15%',['Conductors','Capacitance','Parallel-Plate Capacitors','Capacitors with Dielectrics','Energy Stored in Capacitors']],[11,'Electric Circuits','15-25%',['Current and Resistance',"Ohm's Law and Power",'Series and Parallel Circuits',"Kirchhoff's Rules",'RC Circuits']],[12,'Magnetic Fields and Electromagnetism','10-20%',['Magnetic Fields','Magnetic Forces on Moving Charges','Magnetic Forces on Current-Carrying Wires','Biot-Savart Law',"Ampere's Law"]],[13,'Electromagnetic Induction','10-20%',['Magnetic Flux',"Faraday's Law", "Lenz's Law", 'Motional EMF','Inductance and LR Circuits']]] },
  { code: 'AP_CSP', name: 'AP Computer Science Principles', color: '#059669', icon: 'CP', description: 'Creative development, data, algorithms, programming, computer systems, networks, and impacts of computing.', units: [[1,'Creative Development','10-13%',['Program Design and Development','Collaboration','Program Function and Purpose','Identifying and Correcting Errors']],[2,'Data','17-22%',['Binary Numbers','Data Compression','Extracting Information from Data','Using Programs with Data','Metadata and Data Abstraction']],[3,'Algorithms and Programming','30-35%',['Variables and Assignments','Data Abstraction','Mathematical Expressions','Strings','Boolean Expressions','Conditionals','Iteration','Lists','Procedures','Algorithmic Efficiency','Simulations']],[4,'Computer Systems and Networks','11-15%',['The Internet','Fault Tolerance','Parallel and Distributed Computing','Computer Systems','Internet Protocols']],[5,'Impact of Computing','21-26%',['Beneficial and Harmful Effects','Digital Divide','Computing Bias','Crowdsourcing','Legal and Ethical Concerns','Safe Computing']]] },
  { code: 'AP_CSA', name: 'AP Computer Science A', color: '#0891B2', icon: 'CA', description: 'Java programming using objects, methods, control structures, classes, and data collections.', units: [[1,'Using Objects and Methods','35-40%',['Objects and Classes','Creating Objects','Calling Methods','Method Parameters and Return Values','Primitive Types','String Objects','Math Class Methods','Wrapper Classes','Documentation and Preconditions']],[2,'Selection and Iteration','25-30%',['Boolean Expressions','if Statements','if-else and else-if Statements','Compound Boolean Expressions','while Loops','for Loops','Nested Iteration','Tracing and Debugging Control Structures']],[3,'Class Creation','15-20%',['Anatomy of a Class','Instance Variables','Constructors','Accessor and Mutator Methods','Writing Methods','Encapsulation','Static Variables and Methods','Inheritance','Polymorphism']],[4,'Data Collections','25-30%',['One-Dimensional Arrays','Array Traversals','Array Algorithms','ArrayList Objects','ArrayList Traversals','2D Arrays','2D Array Traversals','Searching and Sorting','Recursion']]] },
  { code: 'AP_STATS', name: 'AP Statistics', color: '#EA580C', icon: 'ST', description: 'Exploring data, collecting data, probability, sampling distributions, and statistical inference.', units: [[1,'Exploring One-Variable Data','15-23%',['Introducing Statistics: What Can We Learn from Data?','The Language of Variation: Variables','Representing a Categorical Variable with Tables','Representing a Categorical Variable with Graphs','Representing a Quantitative Variable with Graphs','Describing the Distribution of a Quantitative Variable','Summary Statistics for a Quantitative Variable','Graphical Representations of Summary Statistics','Comparing Distributions of a Quantitative Variable','The Normal Distribution']],[2,'Exploring Two-Variable Data','5-7%',['Introducing Statistics: Are Variables Related?','Representing Two Categorical Variables','Statistics for Two Categorical Variables','Representing the Relationship Between Two Quantitative Variables','Correlation','Linear Regression Models','Residuals','Least Squares Regression','Analyzing Departures from Linearity']],[3,'Collecting Data','12-15%',['Introducing Statistics: Do the Data We Collected Tell the Truth?','Introduction to Planning a Study','Random Sampling and Data Collection','Potential Problems with Sampling','Introduction to Experimental Design','Selecting an Experimental Design','Inference and Experiments']],[4,'Probability, Random Variables, and Probability Distributions','10-20%',['Introducing Statistics: Random and Non-Random Patterns?','Estimating Probabilities Using Simulation','Introduction to Probability','Mutually Exclusive Events','Conditional Probability','Independent Events and Unions of Events','Introduction to Random Variables and Probability Distributions','Mean and Standard Deviation of Random Variables','Combining Random Variables','Introduction to the Binomial Distribution','Parameters for a Binomial Distribution','The Geometric Distribution']],[5,'Sampling Distributions','7-12%',['Variability in Statistics','The Normal Distribution, Revisited','The Central Limit Theorem','Biased and Unbiased Point Estimates','Sampling Distributions for Sample Proportions','Sampling Distributions for Sample Means']],[6,'Inference for Categorical Data: Proportions','12-15%',['Introducing Statistics: Why Be Normal?','Constructing a Confidence Interval for a Population Proportion','Justifying a Claim Based on a Confidence Interval for a Population Proportion','Setting Up a Test for a Population Proportion','Interpreting p-Values','Concluding a Test for a Population Proportion','Potential Errors When Performing Tests','Confidence Intervals for the Difference of Two Proportions','Justifying a Claim Based on a Confidence Interval for a Difference of Two Proportions','Testing for a Difference of Two Population Proportions']],[7,'Inference for Quantitative Data: Means','10-18%',['Introducing Statistics: Should I Worry About Error?','Constructing a Confidence Interval for a Population Mean','Justifying a Claim Based on a Confidence Interval for a Population Mean','Setting Up a Test for a Population Mean','Carrying Out a Test for a Population Mean','Confidence Intervals for the Difference of Two Means','Justifying a Claim Based on a Confidence Interval for a Difference of Two Means','Setting Up a Test for the Difference of Two Population Means','Carrying Out a Test for the Difference of Two Population Means']],[8,'Inference for Categorical Data: Chi-Square','2-5%',['The Chi-Square Test for Goodness of Fit','The Chi-Square Test for Homogeneity','The Chi-Square Test for Independence','Expected Counts, Conditions, and Contributions']],[9,'Inference for Quantitative Data: Slopes','2-5%',['Introducing Inference for Slopes','Confidence Intervals for the Slope of a Regression Model','Justifying a Claim About the Slope of a Regression Model','Setting Up a Test for the Slope of a Regression Model','Carrying Out a Test for the Slope of a Regression Model']]] },
  { code: 'AP_PRECALC', name: 'AP Precalculus', color: '#A855F7', icon: 'PC', description: 'Polynomial, rational, exponential, logarithmic, trigonometric, polar, parametric, vector, and matrix functions.', units: [[1,'Polynomial and Rational Functions','30-40%',['Change in Tandem','Rates of Change','Rates of Change in Linear and Quadratic Functions','Polynomial Functions and Rates of Change','Polynomial Functions and Complex Zeros','Polynomial Functions and End Behavior','Rational Functions and End Behavior','Rational Functions and Zeros','Rational Functions and Vertical Asymptotes','Rational Functions and Holes','Equivalent Representations of Polynomial and Rational Functions','Transformations of Functions','Function Model Selection and Assumption Articulation']],[2,'Exponential and Logarithmic Functions','27-40%',['Change in Arithmetic and Geometric Sequences','Change in Linear and Exponential Functions','Exponential Functions','Exponential Function Manipulation','Exponential Function Context and Data Modeling','Competing Function Model Validation','Composition of Functions','Inverse Functions','Logarithmic Expressions','Inverses of Exponential Functions','Logarithmic Functions','Logarithmic Function Manipulation','Exponential and Logarithmic Equations and Inequalities','Logarithmic Function Context and Data Modeling','Semi-Log Plots']],[3,'Trigonometric and Polar Functions','30-35%',['Periodic Phenomena','Sine, Cosine, and Tangent','Sine and Cosine Function Values','Sine and Cosine Function Graphs','Sinusoidal Function Transformations','Sinusoidal Function Context and Data Modeling','Sine and Cosine Function Equations and Inequalities','The Tangent Function','Inverse Trigonometric Functions','Trigonometric Equations and Inequalities','The Secant, Cosecant, and Cotangent Functions','Equivalent Representations of Trigonometric Functions','Trigonometry and Polar Coordinates','Polar Function Graphs','Rates of Change in Polar Functions']],[4,'Functions Involving Parameters, Vectors, and Matrices','Not assessed',['Parametric Functions','Parametric Functions Modeling Planar Motion','Parametric Equations and Implicitly Defined Functions','Vectors','Vector-Valued Functions','Matrices','Matrix Multiplication','Matrices as Transformations']]] }
];

function expandedCourses() {
  const byCode = Object.fromEntries(COURSES.map((course) => [course.code, course]));
  return COURSES.map((course) => {
    const inherited = course.extends ? byCode[course.extends].units : [];
    return { ...course, units: [...inherited, ...(course.units || []), ...(course.extraUnits || [])] };
  });
}

function parseWeight(weight) {
  const matches = String(weight).match(/\d+(?:\.\d+)?/g) || [];
  return { min: matches[0] ? Number(matches[0]) : undefined, max: matches[1] ? Number(matches[1]) : matches[0] ? Number(matches[0]) : undefined };
}

function buildTopic(course, unitRecord, topicTitle, index) {
  return {
    unit_id: unitRecord.id,
    course_id: course.code,
    title: topicTitle,
    topic_number: `${unitRecord.unit_number}.${index}`,
    description: `${course.name} Topic ${unitRecord.unit_number}.${index}: ${topicTitle}`,
    key_concepts: [topicTitle, unitRecord.title, course.name],
    latex_formulas: [],
    lesson_content: `This lesson covers ${topicTitle} in ${unitRecord.title} for ${course.name}.`,
    cheatsheet: `Focus: ${topicTitle}\nUnit: ${unitRecord.title}\nCourse: ${course.name}`,
    worked_examples: [],
    order: index
  };
}

async function deleteRecords(entityApi, records) {
  for (const record of records) {
    await entityApi.delete(record.id);
  }
}

async function listAll(entityApi) {
  return await entityApi.list('created_date', 1000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const courses = expandedCourses();
    const courseCodes = new Set(courses.map((course) => course.code));

    const existingCourses = await listAll(base44.asServiceRole.entities.Course);
    for (let index = 0; index < courses.length; index += 1) {
      const course = courses[index];
      const existing = existingCourses.find((item) => item.code === course.code);
      const payload = {
        code: course.code,
        name: course.name,
        color: course.color,
        icon: course.icon,
        description: course.description,
        is_active: true,
        order: index + 1
      };
      if (existing) await base44.asServiceRole.entities.Course.update(existing.id, payload);
      else await base44.asServiceRole.entities.Course.create(payload);
    }

    const allQuestions = await listAll(base44.asServiceRole.entities.Question);
    const allTopics = await listAll(base44.asServiceRole.entities.Topic);
    const allUnits = await listAll(base44.asServiceRole.entities.Unit);

    await deleteRecords(base44.asServiceRole.entities.Question, allQuestions.filter((item) => courseCodes.has(item.course_id)));
    await deleteRecords(base44.asServiceRole.entities.Topic, allTopics.filter((item) => courseCodes.has(item.course_id)));
    await deleteRecords(base44.asServiceRole.entities.Unit, allUnits.filter((item) => courseCodes.has(item.course_id)));

    let unitsCreated = 0;
    let topicsCreated = 0;

    for (const course of courses) {
      for (const unit of course.units) {
        const [unitNumber, title, weight, topics] = unit;
        const parsedWeight = parseWeight(weight);
        const unitRecord = await base44.asServiceRole.entities.Unit.create({
          course_id: course.code,
          title,
          unit_number: unitNumber,
          description: `${course.name}: ${title}`,
          exam_weight_min: parsedWeight.min,
          exam_weight_max: parsedWeight.max,
          order: unitNumber
        });
        unitsCreated += 1;

        const topicRecords = topics.map((topicTitle, topicIndex) => buildTopic(course, unitRecord, topicTitle, topicIndex + 1));
        for (let i = 0; i < topicRecords.length; i += 50) {
          await base44.asServiceRole.entities.Topic.bulkCreate(topicRecords.slice(i, i + 50));
        }
        topicsCreated += topicRecords.length;
      }
    }

    return Response.json({ courses: courses.length, units_created: unitsCreated, topics_created: topicsCreated });
  } catch (error) {
    console.error('seedCourseContent error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});