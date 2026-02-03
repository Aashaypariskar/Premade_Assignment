package com.example.inspection

import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * Main Activity for the Inspection Module.
 */
class InspectionActivity : AppCompatActivity() {

    private lateinit var rvQuestions: RecyclerView
    private lateinit var btnSubmit: Button
    
    // Store answers in a map for easy lookup/update
    private val answers = mutableMapOf<String, InspectionAnswer>()
    private val inspectionId = "INS-101"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_inspection)

        rvQuestions = findViewById(R.id.rvQuestions)
        btnSubmit = findViewById(R.id.btnSubmit)

        setupRecyclerView()

        btnSubmit.setOnClickListener {
            submitData()
        }
    }

    private fun setupRecyclerView() {
        // Mock data
        val mockQuestions = listOf(
            Question("Q1", "Is the exterior clean?", "Exterior"),
            Question("Q2", "Is the paint intact?", "Exterior"),
            Question("Q3", "Is the sink clean?", "Lavatory"),
            Question("Q4", "Is there enough soap?", "Lavatory")
        )

        val adapter = QuestionAdapter(mockQuestions) { question, answer ->
            handleAnswer(question, answer)
        }

        rvQuestions.layoutManager = LinearLayoutManager(this)
        rvQuestions.adapter = adapter
    }

    private fun handleAnswer(question: Question, answer: String) {
        if (answer == "NO") {
            val bottomSheet = ReasonBottomSheet()
            bottomSheet.onDone = { reasons, remarks, images ->
                val inspectionAnswer = InspectionAnswer(
                    inspectionId = inspectionId,
                    sectionName = question.sectionName,
                    questionId = question.id,
                    answer = "NO",
                    selectedReasons = reasons,
                    remarks = remarks,
                    imageUris = images
                )
                answers[question.id] = inspectionAnswer
                Toast.makeText(this, "Saved details for ${question.id}", Toast.LENGTH_SHORT).show()
            }
            bottomSheet.onCancel = {
                // If cancelled, we might want to reset the radio button in the adapter,
                // but for minimalism, we'll just log or toast.
                Toast.makeText(this, "Action cancelled", Toast.LENGTH_SHORT).show()
            }
            bottomSheet.show(supportFragmentManager, "ReasonBottomSheet")
        } else {
            // YES or NA: Save directly
            val inspectionAnswer = InspectionAnswer(
                inspectionId = inspectionId,
                sectionName = question.sectionName,
                questionId = question.id,
                answer = answer
            )
            answers[question.id] = inspectionAnswer
        }
    }

    private fun submitData() {
        if (answers.isEmpty()) {
            Toast.makeText(this, "Please answer at least one question", Toast.LENGTH_SHORT).show()
            return
        }

        // Initialize Retrofit (standard setup)
        val retrofit = Retrofit.Builder()
            .baseUrl("https://api.mock.com/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()

        val service = retrofit.create(ApiService::class.java)
        
        service.submitInspection(answers.values.toList()).enqueue(object : Callback<Unit> {
            override fun onResponse(call: Call<Unit>, response: Response<Unit>) {
                Toast.makeText(this@InspectionActivity, "Submitted successfully!", Toast.LENGTH_SHORT).show()
            }

            override fun onFailure(call: Call<Unit>, t: Throwable) {
                // Mock failure handling
                Toast.makeText(this@InspectionActivity, "Submission simulated: ${answers.size} answers processed", Toast.LENGTH_LONG).show()
                println("Submitted answers: ${answers.values}")
            }
        })
    }
}
