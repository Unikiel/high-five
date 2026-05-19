export const COURSES = [
  {
    code: "AP_CALC_AB",
    name: "AP Calculus AB",
    color: "#0066FF",
    icon: "📈",
    description: "Limits, derivatives, integrals, and the Fundamental Theorem of Calculus.",
    units: [
      { number: 1, title: "Limits and Continuity", weight: "10-12%" },
      { number: 2, title: "Differentiation: Definition and Fundamental Properties", weight: "10-12%" },
      { number: 3, title: "Differentiation: Composite, Implicit, and Inverse Functions", weight: "9-13%" },
      { number: 4, title: "Contextual Applications of Differentiation", weight: "10-15%" },
      { number: 5, title: "Analytical Applications of Differentiation", weight: "15-18%" },
      { number: 6, title: "Integration and Accumulation of Change", weight: "17-20%" },
      { number: 7, title: "Differential Equations", weight: "6-12%" },
      { number: 8, title: "Applications of Integration", weight: "10-15%" },
    ]
  },
  {
    code: "AP_CALC_BC",
    name: "AP Calculus BC",
    color: "#9D4EDD",
    icon: "🧠",
    description: "All of Calculus AB plus sequences/series, parametric, polar, and vector functions.",
    units: [
      { number: 1, title: "Limits and Continuity", weight: "4-7%" },
      { number: 2, title: "Differentiation: Definition and Fundamental Properties", weight: "4-7%" },
      { number: 3, title: "Differentiation: Composite, Implicit, and Inverse Functions", weight: "4-7%" },
      { number: 4, title: "Contextual Applications of Differentiation", weight: "6-9%" },
      { number: 5, title: "Analytical Applications of Differentiation", weight: "8-11%" },
      { number: 6, title: "Integration and Accumulation of Change", weight: "17-20%" },
      { number: 7, title: "Differential Equations", weight: "6-9%" },
      { number: 8, title: "Applications of Integration", weight: "6-9%" },
      { number: 9, title: "Parametric Equations, Polar Coordinates, and Vector-Valued Functions", weight: "11-12%" },
      { number: 10, title: "Infinite Sequences and Series", weight: "17-18%" },
    ]
  },
  {
    code: "AP_PHYSICS_1",
    name: "AP Physics 1",
    color: "#EF4444",
    icon: "⚡",
    description: "Algebra-based mechanics, waves, circuits, and modern physics.",
    units: [
      { number: 1, title: "Kinematics", weight: "12-18%" },
      { number: 2, title: "Forces and Newton's Laws of Motion", weight: "16-20%" },
      { number: 3, title: "Work, Energy, and Power", weight: "12-18%" },
      { number: 4, title: "Systems of Particles and Linear Momentum", weight: "12-18%" },
      { number: 5, title: "Rotation", weight: "12-18%" },
      { number: 6, title: "Oscillations", weight: "4-6%" },
      { number: 7, title: "Gravitation", weight: "4-6%" },
    ]
  },
  {
    code: "AP_PHYSICS_2",
    name: "AP Physics 2",
    color: "#E60000",
    icon: "🔬",
    description: "Algebra-based fluid mechanics, thermodynamics, E&M, optics, and atomic/nuclear physics.",
    units: [
      { number: 1, title: "Fluids", weight: "10-12%" },
      { number: 2, title: "Thermodynamics", weight: "12-18%" },
      { number: 3, title: "Electric Force, Field, and Potential", weight: "18-22%" },
      { number: 4, title: "Electric Circuits", weight: "10-14%" },
      { number: 5, title: "Magnetism and Electromagnetic Induction", weight: "10-14%" },
      { number: 6, title: "Geometric and Physical Optics", weight: "6-8%" },
      { number: 7, title: "Quantum, Atomic, and Nuclear Physics", weight: "6-8%" },
    ]
  },
  {
    code: "AP_PHYSICS_CM",
    name: "AP Physics C: Mechanics",
    color: "#C41E3A",
    icon: "🚀",
    description: "Calculus-based mechanics: kinematics, dynamics, energy, momentum, rotation, oscillations.",
    units: [
      { number: 1, title: "Kinematics", weight: "10-15%" },
      { number: 2, title: "Force and Translational Dynamics", weight: "20-25%" },
      { number: 3, title: "Work, Energy, and Power", weight: "15-25%" },
      { number: 4, title: "Linear Momentum", weight: "10-20%" },
      { number: 5, title: "Torque and Rotational Dynamics", weight: "10-15%" },
      { number: 6, title: "Energy and Momentum of Rotating Systems", weight: "10-15%" },
      { number: 7, title: "Oscillations", weight: "10-15%" },
    ]
  },
  {
    code: "AP_PHYSICS_CE",
    name: "AP Physics C: E&M",
    color: "#B91C1C",
    icon: "⚛️",
    description: "Calculus-based electricity and magnetism: fields, circuits, induction.",
    units: [
      { number: 1, title: "Electrostatics", weight: "25-30%" },
      { number: 2, title: "Conductors, Capacitors, Dielectrics", weight: "15-20%" },
      { number: 3, title: "Electric Circuits", weight: "15-20%" },
      { number: 4, title: "Magnetic Fields", weight: "20-25%" },
      { number: 5, title: "Electromagnetism", weight: "15-20%" },
    ]
  },
  {
    code: "AP_CSP",
    name: "AP Computer Science Principles",
    color: "#10B981",
    icon: "💻",
    description: "Computing innovations, data, algorithms, programming, internet, and societal impacts.",
    units: [
      { number: 1, title: "Creative Development", weight: "10-13%" },
      { number: 2, title: "Data", weight: "17-22%" },
      { number: 3, title: "Algorithms and Programming", weight: "30-35%" },
      { number: 4, title: "Computer Systems and Networks", weight: "11-15%" },
      { number: 5, title: "Impact of Computing", weight: "21-26%" },
    ]
  },
  {
    code: "AP_CSA",
    name: "AP Computer Science A",
    color: "#059669",
    icon: "☕",
    description: "Object-oriented programming in Java: classes, inheritance, arrays, recursion, algorithms.",
    units: [
      { number: 1, title: "Primitive Types", weight: "2-5%" },
      { number: 2, title: "Using Objects", weight: "5-7.5%" },
      { number: 3, title: "Boolean Expressions and if Statements", weight: "15-17.5%" },
      { number: 4, title: "Iteration", weight: "17.5-22.5%" },
      { number: 5, title: "Writing Classes", weight: "5-7.5%" },
      { number: 6, title: "Array", weight: "10-15%" },
      { number: 7, title: "ArrayList", weight: "2.5-7.5%" },
      { number: 8, title: "2D Array", weight: "7.5-10%" },
      { number: 9, title: "Inheritance", weight: "5-10%" },
      { number: 10, title: "Recursion", weight: "5-7.5%" },
    ]
  },
  {
    code: "AP_STATS",
    name: "AP Statistics",
    color: "#FF9F1C",
    icon: "📊",
    description: "Exploring data, collecting data, probability, and statistical inference.",
    units: [
      { number: 1, title: "Exploring One-Variable Data", weight: "15-23%" },
      { number: 2, title: "Exploring Two-Variable Data", weight: "5-7%" },
      { number: 3, title: "Collecting Data", weight: "12-15%" },
      { number: 4, title: "Probability, Random Variables, and Probability Distributions", weight: "10-20%" },
      { number: 5, title: "Sampling Distributions", weight: "7-12%" },
      { number: 6, title: "Inference for Categorical Data: Proportions", weight: "12-15%" },
      { number: 7, title: "Inference for Quantitative Data: Means", weight: "10-18%" },
      { number: 8, title: "Inference for Categorical Data: Chi-Square", weight: "2-5%" },
      { number: 9, title: "Inference for Quantitative Data: Slopes", weight: "2-5%" },
    ]
  },
  {
    code: "AP_PRECALC",
    name: "AP Precalculus",
    color: "#7209B7",
    icon: "📐",
    description: "Polynomial, rational, exponential, logarithmic, and trigonometric functions.",
    units: [
      { number: 1, title: "Polynomial and Rational Functions", weight: "30-40%" },
      { number: 2, title: "Exponential and Logarithmic Functions", weight: "27-40%" },
      { number: 3, title: "Trigonometric and Polar Functions", weight: "30-35%" },
      { number: 4, title: "Functions Involving Parameters, Vectors, and Matrices", weight: "Not assessed" },
    ]
  }
];

export const getCourseByCode = (code) => COURSES.find(c => c.code === code);