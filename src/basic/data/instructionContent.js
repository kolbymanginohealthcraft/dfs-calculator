// Instruction content for different screens in the basic app

export const instructionContent = {
  start: {
    title: "Start Score Screen",
    whatYoureDoing: "Set the initial scores for each self-care and mobility item. These scores represent the patient's functional abilities at the start of their episode.",
    howToUse: [
      "Use the +/- buttons to adjust each score",
      "Choose Walk or Wheelchair for mobility items",
      "When finished, proceed to set the expected score"
    ],
    scoreValues: [
      { number: "6", description: "Independent" },
      { number: "5", description: "Supervision or Setup" },
      { number: "4", description: "Minimal Assistance" },
      { number: "3", description: "Moderate Assistance" },
      { number: "2", description: "Substantial/Maximal Assistance" },
      { number: "1", description: "Dependent" }
    ]
  },
  
  expected: {
    title: "Expected Score Screen",
    whatYoureDoing: "Set the expected score that represents the patient's target functional abilities at discharge.",
    howToUse: [
      "Drag the slider to set the expected score",
      "Use the +/- buttons for fine-tuning (±0.01)",
      "The expected score must be greater than the start score",
      "When finished, proceed to set the end scores"
    ]
  },
  
  end: {
    title: "End Score Screen",
    whatYoureDoing: "Set the final scores for each self-care and mobility item. These scores represent the patient's functional abilities at the end of their episode.",
    howToUse: [
      "Use the +/- buttons to adjust each score",
      "Compare start and end scores using the barbell charts",
      "When finished, view the final results",
      "To save and share the result, click View Clean Results"
    ],
    scoreValues: [
      { number: "6", description: "Independent" },
      { number: "5", description: "Supervision or Setup" },
      { number: "4", description: "Minimal Assistance" },
      { number: "3", description: "Moderate Assistance" },
      { number: "2", description: "Substantial/Maximal Assistance" },
      { number: "1", description: "Dependent" }
    ]
  }
};
