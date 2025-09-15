import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FAQ.module.css';

const FAQ = () => {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqData = [
    {
      category: "General Questions",
      questions: [
        {
          question: "What is the DFS Calculator?",
          answer: "The DFS (Discharge Function Score) Calculator is a comprehensive tool designed to help healthcare professionals assess and model patient function scores for discharge planning. It provides both manual entry capabilities and automated analysis using MDS (Minimum Data Set) files to support clinical decision-making."
        },
        {
          question: "Who created this tool?",
          answer: "The DFS Calculator was created by Aegis Therapies, a leading healthcare solutions provider. It's built with clinical expertise and real-world validation to meet the needs of healthcare professionals in clinical settings nationwide."
        },
        {
          question: "Is this tool CMS compliant?",
          answer: "Yes, the DFS Calculator is based on CMS legislation and regulatory requirements for discharge planning. It follows established guidelines and standards to ensure compliance with healthcare regulations."
        }
      ]
    },
    {
      category: "Getting Started",
      questions: [
        {
          question: "What's the difference between Basic and Advanced modes?",
          answer: "Basic Mode allows for quick manual entry of function scores for straightforward assessments. Advanced Mode enables you to upload MDS files in XML format from your EMR (electronic medical record) system for comprehensive, automated analysis with over 100+ data points that provide more precise expected scores."
        },
        {
          question: "Which mode should I choose?",
          answer: "Choose Basic Mode if you need a quick assessment or don't have access to MDS files. Choose Advanced Mode if you have MDS XML files available and want the most accurate calculations based on comprehensive patient data."
        },
        {
          question: "Do I need to create an account?",
          answer: "No, the DFS Calculator is designed to be used without requiring user accounts or registration. Simply choose your mode and start using the tool immediately."
        }
      ]
    },
    {
      category: "File Upload & Data",
      questions: [
        {
          question: "What file formats are supported?",
          answer: "The Advanced Mode supports MDS files in XML format. These are typically exported from your Electronic Medical Record (EMR) system. The tool processes standard MDS assessment data to calculate function scores."
        },
        {
          question: "What data is processed from MDS files?",
          answer: "The tool processes comprehensive MDS data including patient demographics, functional assessments (GG items), cognitive function (BIMS scores), communication abilities, continence status, mobility type, BMI, and ICD-10 diagnosis codes to calculate accurate function scores."
        },
        {
          question: "Is my patient data secure?",
          answer: "The DFS Calculator processes data locally in your browser. No patient data is stored on external servers. However, always follow your facility's data security protocols when using any clinical tools."
        },
        {
          question: "What if my MDS file has missing data?",
          answer: "The tool includes imputation capabilities to handle missing data points. It uses statistical models based on available patient information to estimate missing function scores, ensuring calculations can still be performed even with incomplete data."
        }
      ]
    },
    {
      category: "Scoring & Calculations",
      questions: [
        {
          question: "How are function scores calculated?",
          answer: "Function scores range from 1 (Dependent) to 6 (Independent), with intermediate levels for different assistance needs. The tool calculates expected scores based on patient characteristics, comorbidities, and functional status using validated algorithms."
        },
        {
          question: "What do the different score levels mean?",
          answer: (
            <div className={styles['score-levels-container']}>
              <p className={styles['score-intro']}>
                Function scores are based on the resident's usual performance at the start of the stay (admission) for each activity. 
                If helper assistance is required because the resident's performance is unsafe or of poor quality, score according to 
                the amount of assistance provided. Activities may be completed with or without assistive devices.
              </p>
              <div className={styles['score-levels']}>
                <div className={styles['score-level']}>
                  <span className={styles['score-number']}>06</span>
                  <div className={styles['score-content']}>
                    <strong className={styles['score-title']}>Independent</strong>
                    <p className={styles['score-description']}>
                      Resident completes the activity by themself with no assistance from a helper.
                    </p>
                  </div>
                </div>
                <div className={styles['score-level']}>
                  <span className={styles['score-number']}>05</span>
                  <div className={styles['score-content']}>
                    <strong className={styles['score-title']}>Setup or clean-up assistance</strong>
                    <p className={styles['score-description']}>
                      Helper sets up or cleans up; resident completes activity. Helper assists only prior to or following the activity.
                    </p>
                  </div>
                </div>
                <div className={styles['score-level']}>
                  <span className={styles['score-number']}>04</span>
                  <div className={styles['score-content']}>
                    <strong className={styles['score-title']}>Supervision or touching assistance</strong>
                    <p className={styles['score-description']}>
                      Helper provides verbal cues and/or touching/steadying and/or contact guard assistance as resident completes activity. 
                      Assistance may be provided throughout the activity or intermittently.
                    </p>
                  </div>
                </div>
                <div className={styles['score-level']}>
                  <span className={styles['score-number']}>03</span>
                  <div className={styles['score-content']}>
                    <strong className={styles['score-title']}>Partial/moderate assistance</strong>
                    <p className={styles['score-description']}>
                      Helper does LESS THAN HALF the effort. Helper lifts, holds, or supports trunk or limbs, but provides less than half the effort.
                    </p>
                  </div>
                </div>
                <div className={styles['score-level']}>
                  <span className={styles['score-number']}>02</span>
                  <div className={styles['score-content']}>
                    <strong className={styles['score-title']}>Substantial/maximal assistance</strong>
                    <p className={styles['score-description']}>
                      Helper does MORE THAN HALF the effort. Helper lifts or holds trunk or limbs and provides more than half the effort.
                    </p>
                  </div>
                </div>
                <div className={styles['score-level']}>
                  <span className={styles['score-number']}>01</span>
                  <div className={styles['score-content']}>
                    <strong className={styles['score-title']}>Dependent</strong>
                    <p className={styles['score-description']}>
                      Helper does ALL of the effort. Resident does none of the effort to complete the activity. 
                      Or, the assistance of 2 or more helpers is required for the resident to complete the activity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        },
        {
          question: "How accurate are the expected scores?",
          answer: "Expected scores in Advanced Mode are calculated using comprehensive algorithms based on CMS guidelines and validated research. Basic Mode relies on clinical judgment. Advanced Mode provides more precise estimates due to the extensive data analysis."
        },
        {
          question: "Can I adjust the calculated scores?",
          answer: "Yes, all calculated scores can be manually adjusted based on your clinical judgment. The tool provides a starting point, but you can modify any score to better reflect the patient's actual or expected functional status."
        }
      ]
    },
    {
      category: "Export & Results",
      questions: [
        {
          question: "Can I export my results?",
          answer: "Yes, the tool provides export functionality to save your calculations and results. You can export data in pdf format for documentation and sharing with your healthcare team."
        },
        {
          question: "What information is included in the export?",
          answer: "Exports typically include patient function scores (start, expected, and end) and calculated gains modeled for each functional domain."
        },
        {
          question: "How can I use these results in discharge planning?",
          answer: "The DFS results help identify functional goals, track progress, and support discharge planning decisions. They provide objective data to guide therapy planning, family discussions, and care transitions."
        }
      ]
    },
    {
      category: "Technical Support",
      questions: [
        {
          question: "What browsers are supported?",
          answer: "The DFS Calculator works with modern web browsers including Chrome, Firefox, Safari, and Edge. For the best experience, ensure your browser is up to date."
        },
        {
          question: "What if I encounter an error?",
          answer: "If you encounter technical issues, try refreshing the page or clearing your browser cache. For file upload issues, ensure your MDS file is in the correct XML format. Contact your IT support if problems persist."
        },
        {
          question: "Is there a mobile version?",
          answer: "The tool is designed to work on various devices, but for the best experience with complex data entry and file uploads, we recommend using a desktop or tablet computer."
        }
      ]
    },
    {
      category: "Clinical Use",
      questions: [
        {
          question: "Should I rely solely on these calculations for patient care?",
          answer: "No, the DFS Calculator provides estimates and should not replace clinical judgment. Results are for informational purposes only and do not guarantee outcomes. Always consult with qualified healthcare professionals for patient care decisions."
        },
        {
          question: "How often should I recalculate scores?",
          answer: "Function scores should be reassessed regularly based on your facility's protocols and patient progress. The tool can be used for initial assessments, progress monitoring, and discharge planning throughout the patient's stay."
        },
        {
          question: "Can this tool be used for quality improvement?",
          answer: "Yes, the DFS Calculator can support quality improvement initiatives by providing objective data on functional outcomes, helping identify trends, and supporting evidence-based practice decisions."
        }
      ]
    }
  ];

  return (
    <div className={styles['faq-container']}>
      {/* Header */}
      <div className={styles['faq-header']}>
        <div className={styles['faq-header-content']}>
          <button 
            className={styles['back-button']}
            onClick={() => navigate('/')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Home
          </button>
          <h1 className={styles['faq-title']}>Frequently Asked Questions</h1>
          <p className={styles['faq-subtitle']}>
            Everything you need to know about the DFS Calculator
          </p>
        </div>
      </div>

      {/* FAQ Content */}
      <div className={styles['faq-content']}>
        <div className={styles['faq-intro']}>
          <p>
            Find answers to common questions about using the DFS Calculator. 
            If you don't see your question answered here, please consult with your 
            clinical team or IT support.
          </p>
        </div>

        {faqData.map((category, categoryIndex) => (
          <div key={categoryIndex} className={styles['faq-category']}>
            <h2 className={styles['category-title']}>{category.category}</h2>
            <div className={styles['faq-items']}>
              {category.questions.map((item, itemIndex) => {
                const globalIndex = `${categoryIndex}-${itemIndex}`;
                const isOpen = openItems.has(globalIndex);
                
                return (
                  <div key={itemIndex} className={styles['faq-item']}>
                    <button
                      className={`${styles['faq-question']} ${isOpen ? styles['open'] : ''}`}
                      onClick={() => toggleItem(globalIndex)}
                    >
                      <span className={styles['question-text']}>{item.question}</span>
                      <svg 
                        className={`${styles['chevron']} ${isOpen ? styles['rotated'] : ''}`}
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div className={styles['faq-answer']}>
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Contact Section */}
        <div className={styles['faq-contact']}>
          <h3>Still have questions?</h3>
          <p>
            For additional support or questions not covered in this FAQ, 
            please consult with your clinical team or facility IT support. 
            The DFS Calculator is designed to support your clinical workflow 
            and enhance patient care planning.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
