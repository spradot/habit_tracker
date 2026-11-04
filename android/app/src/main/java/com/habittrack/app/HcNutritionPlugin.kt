package com.habittrack.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.MealType
import androidx.health.connect.client.records.NutritionRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.time.Instant
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Reads full NutritionRecords (meal name/type + macros) from Health Connect.
 * The READ_NUTRITION permission is granted through the @capgo/capacitor-health
 * requestAuthorization({ read: ['dietaryEnergyConsumed'] }) flow.
 */
@CapacitorPlugin(name = "HcNutrition")
class HcNutritionPlugin : Plugin() {
    private val scope = CoroutineScope(Dispatchers.Main)

    @PluginMethod
    fun readMeals(call: PluginCall) {
        val start = call.getString("startDate")
        val end = call.getString("endDate")
        if (start == null || end == null) {
            call.reject("startDate and endDate are required")
            return
        }
        scope.launch {
            try {
                val client = HealthConnectClient.getOrCreate(context)
                val meals = JSArray()
                var pageToken: String? = null
                do {
                    val res = client.readRecords(
                        ReadRecordsRequest(
                            recordType = NutritionRecord::class,
                            timeRangeFilter = TimeRangeFilter.between(Instant.parse(start), Instant.parse(end)),
                            pageSize = 500,
                            pageToken = pageToken,
                        )
                    )
                    for (r in res.records) {
                        val kcal = r.energy?.inKilocalories ?: continue
                        if (kcal <= 0.0) continue
                        val o = JSObject()
                        o.put("id", r.metadata.id)
                        o.put("startDate", r.startTime.toString())
                        o.put("endDate", r.endTime.toString())
                        o.put("name", r.name ?: "")
                        o.put("mealType", mealTypeName(r.mealType))
                        o.put("calories", kcal)
                        o.put("protein", r.protein?.inGrams ?: 0.0)
                        o.put("carbs", r.totalCarbohydrate?.inGrams ?: 0.0)
                        o.put("fat", r.totalFat?.inGrams ?: 0.0)
                        o.put("source", r.metadata.dataOrigin.packageName)
                        meals.put(o)
                    }
                    pageToken = res.pageToken
                } while (pageToken != null)
                val ret = JSObject()
                ret.put("meals", meals)
                call.resolve(ret)
            } catch (e: Exception) {
                call.reject(e.message ?: "Error leyendo nutrición de Health Connect")
            }
        }
    }

    private fun mealTypeName(t: Int): String = when (t) {
        MealType.MEAL_TYPE_BREAKFAST -> "breakfast"
        MealType.MEAL_TYPE_LUNCH -> "lunch"
        MealType.MEAL_TYPE_DINNER -> "dinner"
        MealType.MEAL_TYPE_SNACK -> "snack"
        else -> "unknown"
    }
}
