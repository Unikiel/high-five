export const COURSES = [
  {
    code: "AP_CALC_AB",
    name: "AP Calculus AB",
    color: "#2563EB",
    icon: "AB",
    description: "Limits, derivatives, integrals, differential equations, and applications of calculus.",
    units: [
      { number: 1, title: "Limits and Continuity", weight: "10-12%", topics: ["Introducing Calculus: Can Change Occur at an Instant?", "Defining Limits and Using Limit Notation", "Estimating Limit Values from Graphs", "Estimating Limit Values from Tables", "Determining Limits Using Algebraic Properties", "Determining Limits Using Algebraic Manipulation", "Selecting Procedures for Determining Limits", "Determining Limits Using the Squeeze Theorem", "Connecting Multiple Representations of Limits", "Exploring Types of Discontinuities", "Defining Continuity at a Point", "Confirming Continuity over an Interval", "Removing Discontinuities", "Connecting Infinite Limits and Vertical Asymptotes", "Connecting Limits at Infinity and Horizontal Asymptotes", "Working with the Intermediate Value Theorem"] },
      { number: 2, title: "Differentiation: Definition and Fundamental Properties", weight: "10-12%", topics: ["Defining Average and Instantaneous Rates of Change", "Defining the Derivative of a Function", "Estimating Derivatives", "Connecting Differentiability and Continuity", "The Power Rule", "Derivative Rules: Constant, Sum, Difference, and Constant Multiple", "Derivatives of sin x, cos x, e^x, and ln x", "The Product Rule", "The Quotient Rule", "Derivatives of tan x, cot x, sec x, and csc x", "Selecting Procedures for Calculating Derivatives", "Higher-Order Derivatives"] },
      { number: 3, title: "Differentiation: Composite, Implicit, and Inverse Functions", weight: "9-13%", topics: ["The Chain Rule", "Implicit Differentiation", "Differentiating Inverse Functions", "Differentiating Inverse Trigonometric Functions", "Selecting Procedures for Differentiation", "Calculating Higher-Order Derivatives"] },
      { number: 4, title: "Contextual Applications of Differentiation", weight: "10-15%", topics: ["Interpreting the Meaning of the Derivative in Context", "Straight-Line Motion", "Rates of Change in Applied Contexts Other Than Motion", "Introduction to Related Rates", "Solving Related Rates Problems", "Approximating Values Using Local Linearity and Linearization", "Using L'Hospital's Rule"] },
      { number: 5, title: "Analytical Applications of Differentiation", weight: "15-18%", topics: ["Using the Mean Value Theorem", "Extreme Value Theorem, Global Extrema, and Local Extrema", "Determining Intervals on Which a Function Is Increasing or Decreasing", "Using the First Derivative Test", "Using the Candidates Test", "Determining Concavity of Functions", "Using the Second Derivative Test", "Sketching Graphs of Functions and Their Derivatives", "Connecting a Function, Its First Derivative, and Its Second Derivative", "Solving Optimization Problems", "Exploring Behaviors of Implicit Relations"] },
      { number: 6, title: "Integration and Accumulation of Change", weight: "17-20%", topics: ["Exploring Accumulations of Change", "Approximating Areas with Riemann Sums", "Riemann Sums, Summation Notation, and Definite Integral Notation", "The Fundamental Theorem of Calculus and Accumulation Functions", "Interpreting the Behavior of Accumulation Functions", "Applying Properties of Definite Integrals", "The Fundamental Theorem of Calculus and Definite Integrals", "Finding Antiderivatives and Indefinite Integrals", "Integrating Using Substitution", "Integrating Functions Using Long Division and Completing the Square"] },
      { number: 7, title: "Differential Equations", weight: "6-12%", topics: ["Modeling Situations with Differential Equations", "Verifying Solutions for Differential Equations", "Sketching Slope Fields", "Reasoning Using Slope Fields", "Euler's Method", "General Solutions Using Separation of Variables", "Particular Solutions Using Initial Conditions", "Exponential Models with Differential Equations"] },
      { number: 8, title: "Applications of Integration", weight: "10-15%", topics: ["Average Value of a Function on an Interval", "Connecting Position, Velocity, and Acceleration Using Integrals", "Using Accumulation Functions in Applied Contexts", "Finding the Area Between Curves Expressed as Functions of x", "Finding the Area Between Curves Expressed as Functions of y", "Volumes with Cross Sections", "Volumes with the Disc Method", "Volumes with the Washer Method"] }
    ]
  },
  {
    code: "AP_CALC_BC",
    name: "AP Calculus BC",
    color: "#7C3AED",
    icon: "BC",
    description: "AP Calculus AB topics plus parametric, polar, vector-valued functions, and infinite series.",
    units: []
  },
  {
    code: "AP_PHYSICS_1",
    name: "AP Physics 1",
    color: "#DC2626",
    icon: "P1",
    description: "Algebra-based mechanics with fluids included in the current AP Physics 1 framework.",
    units: [
      { number: 1, title: "Kinematics", weight: "10-15%", topics: ["Position, Velocity, and Acceleration", "Representations of Motion", "Reference Frames and Relative Motion", "Motion in Two Dimensions"] },
      { number: 2, title: "Force and Translational Dynamics", weight: "18-23%", topics: ["Systems and Center of Mass", "Forces and Free-Body Diagrams", "Newton's Third Law", "Newton's First Law", "Newton's Second Law", "Gravitational Force", "Kinetic and Static Friction", "Spring Forces", "Circular Motion"] },
      { number: 3, title: "Work, Energy, and Power", weight: "18-23%", topics: ["Translational Kinetic Energy", "Work", "Potential Energy", "Conservation of Energy", "Power"] },
      { number: 4, title: "Linear Momentum", weight: "10-15%", topics: ["Linear Momentum", "Change in Momentum and Impulse", "Conservation of Linear Momentum", "Elastic and Inelastic Collisions"] },
      { number: 5, title: "Torque and Rotational Dynamics", weight: "10-15%", topics: ["Rotational Kinematics", "Connecting Linear and Rotational Motion", "Torque", "Rotational Inertia", "Rotational Equilibrium and Newton's First Law", "Rotational Newton's Second Law"] },
      { number: 6, title: "Energy and Momentum of Rotating Systems", weight: "5-8%", topics: ["Rotational Kinetic Energy", "Torque and Work", "Angular Momentum and Angular Impulse", "Conservation of Angular Momentum"] },
      { number: 7, title: "Oscillations", weight: "5-8%", topics: ["Defining Simple Harmonic Motion", "Frequency and Period of Simple Harmonic Oscillators", "Representing and Analyzing Simple Harmonic Motion", "Energy of Simple Harmonic Oscillators"] },
      { number: 8, title: "Fluids", weight: "10-15%", topics: ["Internal Structure and Density", "Pressure", "Fluids and Newton's Laws", "Fluids and Conservation Laws"] }
    ]
  },
  {
    code: "AP_PHYSICS_2",
    name: "AP Physics 2",
    color: "#B91C1C",
    icon: "P2",
    description: "Algebra-based thermodynamics, electricity and magnetism, optics, waves, and modern physics.",
    units: [
      { number: 9, title: "Thermodynamics", weight: "15-20%", topics: ["Thermal Systems and State Variables", "Pressure, Thermal Equilibrium, and Temperature", "Ideal Gas Law", "Kinetic Molecular Theory", "Internal Energy", "Energy Transfer and Thermal Processes", "The First Law of Thermodynamics", "The Second Law of Thermodynamics", "Heat Engines and Refrigerators"] },
      { number: 10, title: "Electric Force, Field, and Potential", weight: "18-22%", topics: ["Electric Charge and Electric Force", "Electric Fields", "Electric Flux", "Electric Potential Energy", "Electric Potential", "Equipotential Lines and Surfaces", "Fields and Potentials of Charge Distributions"] },
      { number: 11, title: "Electric Circuits", weight: "18-22%", topics: ["Current and Resistance", "Ohm's Law and Electric Power", "Series and Parallel Circuits", "Kirchhoff's Rules", "Capacitors in Circuits", "RC Circuits"] },
      { number: 12, title: "Magnetism and Electromagnetism", weight: "10-15%", topics: ["Magnetic Fields", "Magnetic Forces on Moving Charges", "Magnetic Forces on Current-Carrying Wires", "Fields of Long Current-Carrying Wires", "Electromagnetic Induction", "Faraday's Law and Lenz's Law"] },
      { number: 13, title: "Geometric Optics", weight: "8-12%", topics: ["Reflection", "Refraction and Snell's Law", "Images from Mirrors", "Images from Lenses", "Ray Diagrams and Optical Instruments"] },
      { number: 14, title: "Waves, Sound, and Physical Optics", weight: "12-16%", topics: ["Properties of Waves", "Standing Waves and Resonance", "Sound Waves", "Doppler Effect", "Wave Interference", "Diffraction", "Thin-Film Interference"] },
      { number: 15, title: "Modern Physics", weight: "15-20%", topics: ["Photoelectric Effect", "Wave-Particle Duality", "Atomic Energy Levels", "Quantum Transitions", "Nuclear Structure", "Radioactive Decay", "Mass-Energy Equivalence"] }
    ]
  },
  {
    code: "AP_PHYSICS_CM",
    name: "AP Physics C: Mechanics",
    color: "#EA580C",
    icon: "CM",
    description: "Calculus-based mechanics aligned to the current AP Physics C: Mechanics framework.",
    units: [
      { number: 1, title: "Kinematics", weight: "10-15%", topics: ["Scalars and Vectors", "Displacement, Velocity, and Acceleration", "Representing Motion", "Reference Frames and Relative Motion", "Motion in Two Dimensions"] },
      { number: 2, title: "Force and Translational Dynamics", weight: "20-25%", topics: ["Systems and Center of Mass", "Forces and Free-Body Diagrams", "Newton's Laws of Motion", "Gravitational Force", "Friction", "Spring Forces", "Circular Motion"] },
      { number: 3, title: "Work, Energy, and Power", weight: "15-25%", topics: ["Work and Kinetic Energy", "Conservative and Nonconservative Forces", "Potential Energy", "Conservation of Energy", "Power"] },
      { number: 4, title: "Linear Momentum", weight: "10-20%", topics: ["Linear Momentum", "Impulse and Change in Momentum", "Conservation of Linear Momentum", "Collisions", "Center of Mass Motion"] },
      { number: 5, title: "Torque and Rotational Dynamics", weight: "10-15%", topics: ["Rotational Kinematics", "Torque", "Rotational Inertia", "Rotational Equilibrium", "Newton's Second Law for Rotation"] },
      { number: 6, title: "Energy and Momentum of Rotating Systems", weight: "10-15%", topics: ["Rotational Kinetic Energy", "Work and Power in Rotational Motion", "Angular Momentum", "Angular Impulse", "Conservation of Angular Momentum"] },
      { number: 7, title: "Oscillations", weight: "10-15%", topics: ["Simple Harmonic Motion", "Springs and Pendulums", "Energy in Simple Harmonic Motion", "Differential Equations for Oscillations"] }
    ]
  },
  {
    code: "AP_PHYSICS_CE",
    name: "AP Physics C: E&M",
    color: "#C026D3",
    icon: "EM",
    description: "Calculus-based electricity and magnetism aligned to the current AP Physics C: E&M framework.",
    units: [
      { number: 8, title: "Electric Charges, Fields, and Gauss's Law", weight: "15-25%", topics: ["Electric Charge and Electric Force", "Electric Fields", "Electric Flux", "Gauss's Law", "Fields of Charge Distributions", "Conductors in Electrostatic Equilibrium"] },
      { number: 9, title: "Electric Potential", weight: "10-20%", topics: ["Electric Potential Energy", "Electric Potential", "Potential from Point Charges and Distributions", "Equipotential Surfaces", "Relating Electric Field and Electric Potential"] },
      { number: 10, title: "Conductors and Capacitors", weight: "10-15%", topics: ["Conductors", "Capacitance", "Parallel-Plate Capacitors", "Capacitors with Dielectrics", "Energy Stored in Capacitors"] },
      { number: 11, title: "Electric Circuits", weight: "15-25%", topics: ["Current and Resistance", "Ohm's Law and Power", "Series and Parallel Circuits", "Kirchhoff's Rules", "RC Circuits"] },
      { number: 12, title: "Magnetic Fields and Electromagnetism", weight: "10-20%", topics: ["Magnetic Fields", "Magnetic Forces on Moving Charges", "Magnetic Forces on Current-Carrying Wires", "Biot-Savart Law", "Ampere's Law"] },
      { number: 13, title: "Electromagnetic Induction", weight: "10-20%", topics: ["Magnetic Flux", "Faraday's Law", "Lenz's Law", "Motional EMF", "Inductance and LR Circuits"] }
    ]
  },
  {
    code: "AP_CSP",
    name: "AP Computer Science Principles",
    color: "#059669",
    icon: "CP",
    description: "Creative development, data, algorithms, programming, computer systems, networks, and impacts of computing.",
    units: [
      { number: 1, title: "Creative Development", weight: "10-13%", topics: ["Program Design and Development", "Collaboration", "Program Function and Purpose", "Identifying and Correcting Errors"] },
      { number: 2, title: "Data", weight: "17-22%", topics: ["Binary Numbers", "Data Compression", "Extracting Information from Data", "Using Programs with Data", "Metadata and Data Abstraction"] },
      { number: 3, title: "Algorithms and Programming", weight: "30-35%", topics: ["Variables and Assignments", "Data Abstraction", "Mathematical Expressions", "Strings", "Boolean Expressions", "Conditionals", "Iteration", "Lists", "Procedures", "Algorithmic Efficiency", "Simulations"] },
      { number: 4, title: "Computer Systems and Networks", weight: "11-15%", topics: ["The Internet", "Fault Tolerance", "Parallel and Distributed Computing", "Computer Systems", "Internet Protocols"] },
      { number: 5, title: "Impact of Computing", weight: "21-26%", topics: ["Beneficial and Harmful Effects", "Digital Divide", "Computing Bias", "Crowdsourcing", "Legal and Ethical Concerns", "Safe Computing"] }
    ]
  },
  {
    code: "AP_CSA",
    name: "AP Computer Science A",
    color: "#0891B2",
    icon: "CA",
    description: "Java programming using objects, methods, control structures, classes, and data collections.",
    units: [
      { number: 1, title: "Using Objects and Methods", weight: "35-40%", topics: ["Objects and Classes", "Creating Objects", "Calling Methods", "Method Parameters and Return Values", "Primitive Types", "String Objects", "Math Class Methods", "Wrapper Classes", "Documentation and Preconditions"] },
      { number: 2, title: "Selection and Iteration", weight: "25-30%", topics: ["Boolean Expressions", "if Statements", "if-else and else-if Statements", "Compound Boolean Expressions", "while Loops", "for Loops", "Nested Iteration", "Tracing and Debugging Control Structures"] },
      { number: 3, title: "Class Creation", weight: "15-20%", topics: ["Anatomy of a Class", "Instance Variables", "Constructors", "Accessor and Mutator Methods", "Writing Methods", "Encapsulation", "Static Variables and Methods", "Inheritance", "Polymorphism"] },
      { number: 4, title: "Data Collections", weight: "25-30%", topics: ["One-Dimensional Arrays", "Array Traversals", "Array Algorithms", "ArrayList Objects", "ArrayList Traversals", "2D Arrays", "2D Array Traversals", "Searching and Sorting", "Recursion"] }
    ]
  },
  {
    code: "AP_STATS",
    name: "AP Statistics",
    color: "#EA580C",
    icon: "ST",
    description: "Exploring data, collecting data, probability, sampling distributions, and statistical inference.",
    units: [
      { number: 1, title: "Exploring One-Variable Data", weight: "15-23%", topics: ["Introducing Statistics: What Can We Learn from Data?", "The Language of Variation: Variables", "Representing a Categorical Variable with Tables", "Representing a Categorical Variable with Graphs", "Representing a Quantitative Variable with Graphs", "Describing the Distribution of a Quantitative Variable", "Summary Statistics for a Quantitative Variable", "Graphical Representations of Summary Statistics", "Comparing Distributions of a Quantitative Variable", "The Normal Distribution"] },
      { number: 2, title: "Exploring Two-Variable Data", weight: "5-7%", topics: ["Introducing Statistics: Are Variables Related?", "Representing Two Categorical Variables", "Statistics for Two Categorical Variables", "Representing the Relationship Between Two Quantitative Variables", "Correlation", "Linear Regression Models", "Residuals", "Least Squares Regression", "Analyzing Departures from Linearity"] },
      { number: 3, title: "Collecting Data", weight: "12-15%", topics: ["Introducing Statistics: Do the Data We Collected Tell the Truth?", "Introduction to Planning a Study", "Random Sampling and Data Collection", "Potential Problems with Sampling", "Introduction to Experimental Design", "Selecting an Experimental Design", "Inference and Experiments"] },
      { number: 4, title: "Probability, Random Variables, and Probability Distributions", weight: "10-20%", topics: ["Introducing Statistics: Random and Non-Random Patterns?", "Estimating Probabilities Using Simulation", "Introduction to Probability", "Mutually Exclusive Events", "Conditional Probability", "Independent Events and Unions of Events", "Introduction to Random Variables and Probability Distributions", "Mean and Standard Deviation of Random Variables", "Combining Random Variables", "Introduction to the Binomial Distribution", "Parameters for a Binomial Distribution", "The Geometric Distribution"] },
      { number: 5, title: "Sampling Distributions", weight: "7-12%", topics: ["Variability in Statistics", "The Normal Distribution, Revisited", "The Central Limit Theorem", "Biased and Unbiased Point Estimates", "Sampling Distributions for Sample Proportions", "Sampling Distributions for Sample Means"] },
      { number: 6, title: "Inference for Categorical Data: Proportions", weight: "12-15%", topics: ["Introducing Statistics: Why Be Normal?", "Constructing a Confidence Interval for a Population Proportion", "Justifying a Claim Based on a Confidence Interval for a Population Proportion", "Setting Up a Test for a Population Proportion", "Interpreting p-Values", "Concluding a Test for a Population Proportion", "Potential Errors When Performing Tests", "Confidence Intervals for the Difference of Two Proportions", "Justifying a Claim Based on a Confidence Interval for a Difference of Two Proportions", "Testing for a Difference of Two Population Proportions"] },
      { number: 7, title: "Inference for Quantitative Data: Means", weight: "10-18%", topics: ["Introducing Statistics: Should I Worry About Error?", "Constructing a Confidence Interval for a Population Mean", "Justifying a Claim Based on a Confidence Interval for a Population Mean", "Setting Up a Test for a Population Mean", "Carrying Out a Test for a Population Mean", "Confidence Intervals for the Difference of Two Means", "Justifying a Claim Based on a Confidence Interval for a Difference of Two Means", "Setting Up a Test for the Difference of Two Population Means", "Carrying Out a Test for the Difference of Two Population Means"] },
      { number: 8, title: "Inference for Categorical Data: Chi-Square", weight: "2-5%", topics: ["The Chi-Square Test for Goodness of Fit", "The Chi-Square Test for Homogeneity", "The Chi-Square Test for Independence", "Expected Counts, Conditions, and Contributions"] },
      { number: 9, title: "Inference for Quantitative Data: Slopes", weight: "2-5%", topics: ["Introducing Inference for Slopes", "Confidence Intervals for the Slope of a Regression Model", "Justifying a Claim About the Slope of a Regression Model", "Setting Up a Test for the Slope of a Regression Model", "Carrying Out a Test for the Slope of a Regression Model"] }
    ]
  },
  {
    code: "AP_PRECALC",
    name: "AP Precalculus",
    color: "#A855F7",
    icon: "PC",
    description: "Polynomial, rational, exponential, logarithmic, trigonometric, polar, parametric, vector, and matrix functions.",
    units: [
      { number: 1, title: "Polynomial and Rational Functions", weight: "30-40%", topics: ["Change in Tandem", "Rates of Change", "Rates of Change in Linear and Quadratic Functions", "Polynomial Functions and Rates of Change", "Polynomial Functions and Complex Zeros", "Polynomial Functions and End Behavior", "Rational Functions and End Behavior", "Rational Functions and Zeros", "Rational Functions and Vertical Asymptotes", "Rational Functions and Holes", "Equivalent Representations of Polynomial and Rational Functions", "Transformations of Functions", "Function Model Selection and Assumption Articulation"] },
      { number: 2, title: "Exponential and Logarithmic Functions", weight: "27-40%", topics: ["Change in Arithmetic and Geometric Sequences", "Change in Linear and Exponential Functions", "Exponential Functions", "Exponential Function Manipulation", "Exponential Function Context and Data Modeling", "Competing Function Model Validation", "Composition of Functions", "Inverse Functions", "Logarithmic Expressions", "Inverses of Exponential Functions", "Logarithmic Functions", "Logarithmic Function Manipulation", "Exponential and Logarithmic Equations and Inequalities", "Logarithmic Function Context and Data Modeling", "Semi-Log Plots"] },
      { number: 3, title: "Trigonometric and Polar Functions", weight: "30-35%", topics: ["Periodic Phenomena", "Sine, Cosine, and Tangent", "Sine and Cosine Function Values", "Sine and Cosine Function Graphs", "Sinusoidal Function Transformations", "Sinusoidal Function Context and Data Modeling", "Sine and Cosine Function Equations and Inequalities", "The Tangent Function", "Inverse Trigonometric Functions", "Trigonometric Equations and Inequalities", "The Secant, Cosecant, and Cotangent Functions", "Equivalent Representations of Trigonometric Functions", "Trigonometry and Polar Coordinates", "Polar Function Graphs", "Rates of Change in Polar Functions"] },
      { number: 4, title: "Functions Involving Parameters, Vectors, and Matrices", weight: "Not assessed", topics: ["Parametric Functions", "Parametric Functions Modeling Planar Motion", "Parametric Equations and Implicitly Defined Functions", "Vectors", "Vector-Valued Functions", "Matrices", "Matrix Multiplication", "Matrices as Transformations"] }
    ]
  }
];

COURSES.find((course) => course.code === "AP_CALC_BC").units = [
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[0], weight: "4-7%" },
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[1], weight: "4-7%" },
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[2], weight: "4-7%" },
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[3], weight: "6-9%" },
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[4], weight: "8-11%" },
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[5], weight: "17-20%" },
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[6], weight: "6-9%" },
  { ...COURSES.find((course) => course.code === "AP_CALC_AB").units[7], weight: "6-9%" },
  { number: 9, title: "Parametric Equations, Polar Coordinates, and Vector-Valued Functions", weight: "11-12%", topics: ["Defining and Differentiating Parametric Equations", "Second Derivatives of Parametric Equations", "Finding Arc Lengths of Curves Given by Parametric Equations", "Defining and Differentiating Vector-Valued Functions", "Integrating Vector-Valued Functions", "Solving Motion Problems Using Parametric and Vector-Valued Functions", "Defining Polar Coordinates and Differentiating in Polar Form", "Finding Areas of Polar Regions", "Finding Arc Lengths of Polar Curves"] },
  { number: 10, title: "Infinite Sequences and Series", weight: "17-18%", topics: ["Defining Convergent and Divergent Infinite Series", "Working with Geometric Series", "The nth Term Test", "Integral Test", "Harmonic Series and p-Series", "Comparison Tests", "Alternating Series Test", "Ratio Test", "Determining Absolute or Conditional Convergence", "Alternating Series Error Bound", "Finding Taylor Polynomial Approximations", "Lagrange Error Bound", "Radius and Interval of Convergence", "Representing Functions as Power Series", "Maclaurin Series for Common Functions", "Taylor Series"] }
];

export const getCourseByCode = (code) => COURSES.find((course) => course.code === code);