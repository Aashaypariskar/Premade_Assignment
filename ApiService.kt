package com.example.inspection

import retrofit2.Call
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * Simple Retrofit interface for inspection API.
 */
interface ApiService {
    @POST("inspection/submit")
    fun submitInspection(@Body answers: List<InspectionAnswer>): Call<Unit>
}
