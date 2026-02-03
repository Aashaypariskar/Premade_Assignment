package com.example.inspection

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

/**
 * Adapter to display a list of inspection questions.
 */
class QuestionAdapter(
    private val questions: List<Question>,
    private val onAnswerChanged: (Question, String) -> Unit
) : RecyclerView.Adapter<QuestionAdapter.QuestionViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): QuestionViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_question, parent, false)
        return QuestionViewHolder(view)
    }

    override fun onBindViewHolder(holder: QuestionViewHolder, position: Int) {
        holder.bind(questions[position])
    }

    override fun getItemCount(): Int = questions.size

    inner class QuestionViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvQuestion: TextView = itemView.findViewById(R.id.tvQuestionText)
        private val rgAnswers: RadioGroup = itemView.findViewById(R.id.rgAnswers)
        private val rbYes: RadioButton = itemView.findViewById(R.id.rbYes)
        private val rbNo: RadioButton = itemView.findViewById(R.id.rbNo)
        private val rbNa: RadioButton = itemView.findViewById(R.id.rbNa)

        fun bind(question: Question) {
            tvQuestion.text = question.text
            
            // Avoid triggering listener during binding
            rgAnswers.setOnCheckedChangeListener(null)
            rgAnswers.clearCheck()

            rgAnswers.setOnCheckedChangeListener { _, checkedId ->
                val answer = when (checkedId) {
                    R.id.rbYes -> "YES"
                    R.id.rbNo -> "NO"
                    R.id.rbNa -> "NA"
                    else -> ""
                }
                if (answer.isNotEmpty()) {
                    onAnswerChanged(question, answer)
                }
            }
        }
    }
}
