/**
 * Export utilities for converting survey to different formats
 * Supports: DOCX, Qualtrics JSON, Typeform CSV
 */

import { Document, Packer, Paragraph, TextRun } from 'docx'

/**
 * Convert SurveyJS JSON to DOCX format
 */
export async function exportToDocx(surveyJson: any): Promise<void> {
  try {
    const sections: Paragraph[] = []

    // Add title
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Survey',
            bold: true,
            size: 64, // 32pt in half-points
          }),
        ],
      })
    )

    // Add pages and questions
    const pages = surveyJson.pages || []
    pages.forEach((page: any, pageIdx: number) => {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Page ${pageIdx + 1}: ${page.name || 'Untitled'}`,
              bold: true,
              size: 48, // 24pt
            }),
          ],
        })
      )

      // Add elements (questions)
      const elements = page.elements || []
      elements.forEach((element: any) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.title || element.name || 'Question',
                bold: true,
                size: 40, // 20pt
              }),
            ],
          })
        )

        // Add choices if available
        if (element.choices && Array.isArray(element.choices)) {
          element.choices.forEach((choice: any) => {
            const choiceText = typeof choice === 'string' ? choice : choice.text || choice.value
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `  • ${choiceText}`,
                    size: 22, // 11pt
                  }),
                ],
              })
            )
          })
          sections.push(new Paragraph({ text: '' }))
        } else {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '[Open response]',
                  italics: true,
                  size: 22,
                }),
              ],
            })
          )
          sections.push(new Paragraph({ text: '' }))
        }
      })
    })

    // Create document
    const doc = new Document({
      sections: [{ children: sections }],
    })

    // Generate and download
    const blob = await Packer.toBlob(doc)
    downloadFile(blob, 'survey.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  } catch (error) {
    console.error('DOCX export failed:', error)
    throw error
  }
}

/**
 * Convert SurveyJS JSON to Qualtrics format
 */
export async function exportToQualtrics(surveyJson: any): Promise<void> {
  try {
    const qualtricsJson = {
      SurveyEntry: {
        SurveyID: 'SV_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        SurveyName: 'Imported Survey',
        SurveyDescription: '',
        SurveyStatus: 'Active',
        CreationDate: new Date().toISOString(),
        Questions: convertToQualtricsQuestions(surveyJson),
      },
    }

    const jsonString = JSON.stringify(qualtricsJson, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    downloadFile(blob, 'survey_qualtrics.json', 'application/json')
  } catch (error) {
    console.error('Qualtrics export failed:', error)
    throw error
  }
}

/**
 * Convert SurveyJS JSON to Typeform CSV format
 */
export async function exportToTypeform(surveyJson: any): Promise<void> {
  try {
    let csv = 'Question Type,Question Text,Answer Type,Answer Options\n'

    const pages = surveyJson.pages || []
    pages.forEach((page: any) => {
      const elements = page.elements || []
      elements.forEach((element: any) => {
        const questionText = (element.title || element.name || 'Question').replace(/"/g, '""')
        const questionType = element.type || 'text'
        let answerType = 'short_text'
        let answerOptions = ''

        if (element.type === 'radiogroup' || element.type === 'checkbox') {
          answerType = element.type === 'checkbox' ? 'multiple_choice' : 'multiple_choice'
          const choices = (element.choices || [])
            .map((c: any) => (typeof c === 'string' ? c : c.text || c.value))
            .join('|')
          answerOptions = choices
        } else if (element.type === 'rating') {
          answerType = 'rating'
          answerOptions = element.rateCount || 5
        } else if (element.type === 'ranking') {
          answerType = 'ranking'
          const choices = (element.choices || [])
            .map((c: any) => (typeof c === 'string' ? c : c.text || c.value))
            .join('|')
          answerOptions = choices
        }

        csv += `"${questionType}","${questionText}","${answerType}","${answerOptions}"\n`
      })
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    downloadFile(blob, 'survey_typeform.csv', 'text/csv')
  } catch (error) {
    console.error('Typeform export failed:', error)
    throw error
  }
}

/**
 * Convert SurveyJS questions to Qualtrics format
 */
function convertToQualtricsQuestions(surveyJson: any): any[] {
  const questions: any[] = []
  let qId = 1

  const pages = surveyJson.pages || []
  pages.forEach((page: any) => {
    const elements = page.elements || []
    elements.forEach((element: any) => {
      const qNumber = `QID${qId}`
      qId++

      const baseQuestion = {
        QID: qNumber,
        QuestionType: 'MC',
        QuestionText: element.title || element.name || 'Question',
        DefaultAnswers: [],
        Choices: {} as any,
      }

      if (element.choices && Array.isArray(element.choices)) {
        let choiceId = 1
        element.choices.forEach((choice: any) => {
          const choiceText = typeof choice === 'string' ? choice : choice.text || choice.value
          baseQuestion.Choices[choiceId] = { Display: choiceText }
          choiceId++
        })
      } else {
        baseQuestion.QuestionType = 'TE'
      }

      questions.push(baseQuestion)
    })
  })

  return questions
}

/**
 * Utility to download a blob as file
 */
function downloadFile(blob: Blob, filename: string, mimeType: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.type = mimeType
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
