// Instruction content for different screens in the basic app

// Common score values used across multiple instruction types
const commonScoreValues = [
  { number: "6", description: "Independent" },
  { number: "5", description: "Setup or clean-up assistance" },
  { number: "4", description: "Supervision or touching assistance" },
  { number: "3", description: "Partial/moderate assistance" },
  { number: "2", description: "Substantial/maximal assistance" },
  { number: "1", description: "Dependent" }
];


export const instructionContent = {
  start: {
    title: "Start Score Screen",
    whatYoureDoing: "Set the initial scores for each self-care and mobility item. These scores represent the patient's functional abilities at the start of their episode.",
    howToUse: [
      "Use the +/- buttons to adjust each score",
      "Choose Walk or Wheelchair for mobility items",
      "When finished, proceed to set the expected score"
    ],
    scoreValues: commonScoreValues
  },
  
  expected: {
    title: "Expected Score Screen",
    whatYoureDoing: "Set the expected score that represents the patient's target functional ability at discharge. This number can be estimated using your clinical judgement or given to you by a separate tool. The advanced version of this calculator can provide that number but requires an MDS file in XML format as there are 100+ inputs required to calculate it precisely.",
    howToUse: [
      "Drag the slider to set the expected score",
      "Use the +/- buttons for fine-tuning",
      "The expected score must be greater than the start score",
      "When finished, proceed to set the end scores"
    ]
  },
  
  end: {
    title: "End Score Screen",
    whatYoureDoing: "Set the final scores for each self-care and mobility item. These scores represent the patient's functional abilities at the end of their episode or at any interim point in their stay.",
    howToUse: [
      "Use the +/- buttons to adjust each score",
      "Watch how the gains bring the score closer to the expected score",
      "When finished, you can export the results"
    ],
    scoreValues: commonScoreValues
  },

  advanced: {
    title: "Advanced DFS Calculator",
    whatYoureDoing: "You have already uploaded the MDS file, so you already have the start scores and expected score. Now you just need to set the final scores for each self-care and mobility item. These scores represent the patient's functional abilities at the end of their episode or at any interim point in their stay.",
    howToUse: [
      "Review tabs to explore how the calculations were made and details from the MDS file",
      "Use the +/- buttons to adjust each score",
      "Watch how the gains bring the score closer to the expected score",
      "When finished, you can export the results"
    ],
    scoreValues: commonScoreValues
  }
};
