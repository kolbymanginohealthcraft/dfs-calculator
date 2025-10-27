import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './FAQ.module.css';

const FAQ = () => {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  // Auto-focus search input when component mounts
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setOpenItems(new Set()); // Close all items when clearing search
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (searchTerm) {
        // First escape: clear search
        clearSearch();
      } else if (isSearchFocused) {
        // Second escape: exit search focus
        searchInputRef.current?.blur();
      }
    }
  };

  // Function to highlight matching text
  const highlightText = (text, searchTerm) => {
    if (!searchTerm.trim()) {
      return text;
    }

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    
    // If text is a string, process it normally
    if (typeof text === 'string') {
      const parts = text.split(regex);
      return parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <span key={index} className={styles['highlight']}>
              {part}
            </span>
          );
        }
        return part;
      });
    }
    
    // If text is JSX, recursively process it
    if (React.isValidElement(text)) {
      const processChildren = (children) => {
        return React.Children.map(children, (child, index) => {
          if (typeof child === 'string') {
            const parts = child.split(regex);
            return parts.map((part, partIndex) => {
              if (regex.test(part)) {
                return (
                  <span key={`${index}-${partIndex}`} className={styles['highlight']}>
                    {part}
                  </span>
                );
              }
              return part;
            });
          } else if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              key: child.key || index,
              children: processChildren(child.props.children)
            });
          }
          return child;
        });
      };

      return React.cloneElement(text, {
        children: processChildren(text.props.children)
      });
    }
    
    return text;
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
          answer: "Yes, the DFS Calculator is based on documented CMS guidance and standards."
        }
      ]
    },
    {
      category: "Getting Started",
      questions: [
        {
          question: "How do I access the DFS Calculator?",
          answer: "The tool is accessed via the Aegis Therapies myCare Portal. Users will use their Aegis assigned credentials to log onto myCare. Once logged on locate the DFS Calculator Tile. If desired, the tile can be saved as a favorite. [potentially need to build these out a bit for employees vs. clients]"
        },
        {
          question: "Do I need to create an account?",
          answer: "No, the DFS Calculator is designed to be used without requiring any additional user accounts or registration."
        },
        {
          question: "What's the difference between Basic and Advanced modes?",
          answer: (
            <div>
              <p><strong>Basic Mode</strong> allows for quick manual entry of approximate function scores for discharge planning.</p>
              <div className={styles['mode-separator']}></div>
              <p><strong>Advanced Mode</strong> enables you to upload MDS files in XML format from your EMR (electronic medical record) system for comprehensive, automated analysis with over 100+ data points that provide more precise expected scores.</p>
            </div>
          )
        },
        {
          question: "Which mode should I choose?",
          answer: (
            <div>
              <p>Choose <strong>Basic Mode</strong> if you need a quick approximation or are not able to export the MDS file.</p>
              <div className={styles['mode-separator']}></div>
              <p>Choose <strong>Advanced Mode</strong> if you have MDS XML files available and want the most accurate calculations based on comprehensive patient data.</p>
            </div>
          )
        }
      ]
    },
    {
      category: "Data and File Uploads",
      questions: [
        {
          question: "Is my patient data secure?",
          answer: "The DFS Calculator processes data locally in your browser. No patient data is stored on devices nor on external servers. However, always follow your facility's data security protocols when using any clinical tools."
        },
        {
          question: "What file formats are supported?",
          answer: "The Advanced Mode supports MDS files in XML format. These are typically exported from your Electronic Medical Record (EMR) system. The tool processes standard MDS assessment data to calculate function scores."
        },
        {
          question: "What data is processed from MDS files?",
          answer: "The tool processes comprehensive MDS data including patient demographics, functional assessments (GG items), cognitive function (BIMS scores), communication abilities, continence status, mobility type, BMI, and ICD-10 diagnosis codes to calculate accurate function scores."
        },
        {
          question: "What if my MDS file has missing data or Activity Not Attempted (ANA) scores?",
          answer: (
            <div>
              <p>If you are using the <strong>Basic mode</strong> and the MDS has items that are scored using anything other than 1 through 6, enter a default score of 1.</p>
              <div className={styles['mode-separator']}></div>
              <p>If you are using the <strong>Advanced mode</strong>, the tool includes imputation capabilities to handle missing data points. It uses statistical models based on available patient information to estimate missing function scores, ensuring calculations can still be performed even with incomplete data.</p>
            </div>
          )
        }
      ]
    },
    {
      category: "Scoring and Calculations",
      questions: [
        {
          question: "What do the different score levels mean?",
          answer: (
            <div className={styles['score-levels-container']}>
              <p className={styles['score-intro']}>
                Function scores are based on the resident's usual performance at the start of the stay (admission) for each activity. The scoring scale utilized is from Section GG of the MDS. If helper assistance is required because the resident's performance is unsafe or of poor quality, score according to the amount of assistance provided. Activities may be completed with or without assistive devices.
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
          question: "If using the Basic mode, how do I know where to set the expected score?",
          answer: "If your facility has MDS scrubber software that provides a calculated expected score, enter that score. If not, based on our data, we recommend that you set the expected score at a level that is 13-15 points above the admission score."
        },
        // {
        //   question: "Am I able to adjust the score?",
        //   answer: "Yes, all scores can be manually adjusted based on your clinical judgment. The tool provides a starting point, but you can modify any score to better reflect the patient's actual or expected functional status."
        // },
        {
          question: "If using the Advanced mode, how are function scores calculated?",
          answer: "Function scores range from 1 (Dependent) to 6 (Independent), with intermediate levels for different assistance needs. The tool calculates expected scores based on patient characteristics, comorbidities, and functional status using validated algorithms."
        },
        {
          question: "How accurate are the expected scores?",
          answer: "Expected scores in Advanced Mode are calculated using comprehensive algorithms based on CMS guidelines and validated research. Basic Mode relies on clinical judgment. Advanced Mode provides more precise estimates due to the extensive data analysis."
        }
      ]
    },
    {
      category: "Export and Results",
      questions: [
        {
          question: "Can I export and save my results?",
          answer: "As noted earlier, the DFS Calculator processes data locally in your browser. No patient data is stored on external servers. However, the tool provides export functionality to save your calculations and results. You can export data in pdf format and save the files locally using a naming convention of your design for documentation and sharing with your healthcare team."
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
    },
    {
      category: "File Upload Issues",
      questions: [
        {
          question: "What file format errors might I encounter?",
          answer: (
            <div>
              <p><strong>Common file format errors include:</strong></p>
              <ul>
                <li><strong>PDF Converted:</strong> File was converted from PDF to XML instead of being exported from EMR</li>
                <li><strong>Form Converted:</strong> Contains form field indicators instead of data</li>
                <li><strong>File Too Large:</strong> Exceeds 10MB limit</li>
                <li><strong>Wrong File Type:</strong> Not an XML file</li>
                <li><strong>Invalid XML:</strong> Syntax errors in the XML structure</li>
                <li><strong>Wrong Root Element:</strong> Missing ASSESSMENT or MDS root element</li>
                <li><strong>Invalid XML Structure:</strong> Improper XML format</li>
              </ul>
              <p><strong>Solution:</strong> Always export your MDS data directly as XML from your EMR system, not from converted PDFs or other formats.</p>
            </div>
          )
        },
        {
          question: "What assessment type errors might I see?",
          answer: (
            <div>
              <p><strong>Accepted assessment types:</strong> Only NC (Nursing home comprehensive) and NP (Nursing home PPS) assessments are supported.</p>
              <p><strong>Common errors include:</strong></p>
              <ul>
                <li><strong>Discharge Assessment:</strong> ND, SD, NPE assessments</li>
                <li><strong>Quarterly Assessment:</strong> NQ assessments</li>
                <li><strong>Tracking Record:</strong> NT, ST assessments</li>
                <li><strong>Swing Bed assessments:</strong> SP, SD, ST assessments</li>
                <li><strong>Incorrect A0310A (Type of Assessment) values:</strong> Only 01 (admission) or 99 ('none of the above') are accepted</li>
              </ul>
              <p><strong>Solution:</strong> Upload only NC or NP assessments with proper assessment types.</p>
            </div>
          )
        },
        {
          question: "What data content errors might occur?",
          answer: (
            <div>
              <p><strong>Data content errors include:</strong></p>
              <ul>
                <li><strong>Missing MDS Data:</strong> Missing required elements like A0100A (NPI), A0100B (CCN), A2300 (ARD), I0020 (Primary Medical Condition Category)</li>
                <li><strong>Insufficient Function Data:</strong> Not enough GG function assessment elements for reliable imputation (minimum 5 required)</li>
                <li><strong>Invalid Function Scores:</strong> GG values must be 01-06, 07, 09, 10, 88, ^, or -</li>
                <li><strong>Invalid Date Format:</strong> A2300 (Assessment Reference Date) must be YYYY-MM-DD or YYYYMMDD</li>
                <li><strong>Not MDS File:</strong> Insufficient MDS elements</li>
                <li><strong>Missing or Invalid Data:</strong> General processing failures</li>
              </ul>
              <p><strong>Solution:</strong> Ensure your MDS file contains complete, valid data for all required elements.</p>
            </div>
          )
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
          question: "How do I know if my MDS file is correct?",
          answer: "A correct MDS file should be: 1) Exported directly from your EMR system as XML, 2) Be an NC (comprehensive) or NP (PPS) assessment type, 3) Contain complete function assessment data (GG items), 4) Have proper XML structure with ASSESSMENT or MDS root element, and 5) Be under 10MB in size."
        }
        // {
        //   question: "Is there a mobile version?",
        //   answer: "The tool is designed to work on various devices, but for the best experience with complex data entry and file uploads, we recommend using a desktop or tablet computer."
        // }
      ]
    }
  ];

  // Helper function to extract text content from JSX
  const extractTextFromJSX = (element) => {
    if (typeof element === 'string') {
      return element;
    }
    if (React.isValidElement(element)) {
      const children = React.Children.map(element.props.children, extractTextFromJSX);
      return children ? children.join('') : '';
    }
    if (Array.isArray(element)) {
      return element.map(extractTextFromJSX).join('');
    }
    return '';
  };

  // Filter FAQ data based on search term and auto-expand results
  const filteredFaqData = useMemo(() => {
    if (!searchTerm.trim()) {
      return faqData;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = faqData.map(category => ({
      ...category,
      questions: category.questions.filter(item => {
        const questionText = item.question.toLowerCase();
        const answerText = typeof item.answer === 'string' 
          ? item.answer.toLowerCase() 
          : extractTextFromJSX(item.answer).toLowerCase();
        
        return questionText.includes(searchLower) || answerText.includes(searchLower);
      })
    })).filter(category => category.questions.length > 0);

    // Auto-expand all filtered results
    if (filtered.length > 0) {
      const newOpenItems = new Set();
      filtered.forEach((category, categoryIndex) => {
        category.questions.forEach((_, questionIndex) => {
          newOpenItems.add(`${categoryIndex}-${questionIndex}`);
        });
      });
      setOpenItems(newOpenItems);
    }

    return filtered;
  }, [searchTerm]);

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
        {/* Search Bar */}
        <div className={styles['search-container']}>
          <div className={styles['search-bar']}>
            <svg className={styles['search-icon']} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              onKeyDown={handleKeyDown}
              className={styles['search-input']}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className={styles['clear-button']}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          {searchTerm && (
            <div className={styles['search-results-info']}>
              {filteredFaqData.reduce((total, category) => total + category.questions.length, 0)} result(s) found
              {filteredFaqData.reduce((total, category) => total + category.questions.length, 0) > 0 && (
                <span className={styles['auto-expanded-note']}> • Auto-expanded</span>
              )}
            </div>
          )}
        </div>

        {filteredFaqData.map((category, categoryIndex) => (
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
                      <span className={styles['question-text']}>
                        {highlightText(item.question, searchTerm)}
                      </span>
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
                        {typeof item.answer === 'string' ? (
                          <p>{highlightText(item.answer, searchTerm)}</p>
                        ) : (
                          highlightText(item.answer, searchTerm)
                        )}
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
