<script>
import { Chart, registerables } from 'chart.js'

// Register Chart.js components
Chart.register(...registerables)
export default {
  props: {
    roomSales: Array,
    totalBookings: Number
  },
  data() {
    return {
      roomLabels: [],
      roomData: [],
      roomColors: ['#8884d8', '#37DDB2', '#FFD88D', '#FF9F7B']
    }
  },
  watch: {
    roomSales() {
      this.roomLabels = this.roomSales.map((room) => room.roomName)
      this.roomData = this.roomSales.map((room) => room.book_count)
      this.renderChart()
    }
  },
  methods: {
    renderChart() {
      const ctx = this.$refs.bookingChart.getContext('2d')
      this.chartInstance = new Chart(ctx, {
        type: 'bar', // e.g., 'bar', 'line', etc.
        type: 'doughnut',
        data: {
          labels: this.roomLabels,
          datasets: [
            {
              data: this.roomData,
              backgroundColor: this.roomColors.slice(0, this.roomData.length)
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          cutout: '60%'
        }
      })
    }
  },

  beforeDestroy() {
    if (this.chartInstance) {
      this.chartInstance.destroy()
    }
  }
}
</script>
<template>
  <!-- Room Booking Chart Card -->
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">Room Booking Chart</h2>
      <button class="period-selector">30 Days ▼</button>
    </div>

    <div class="chart-container">
      <canvas ref="bookingChart"></canvas>
    </div>

    <div class="legend-grid">
      <div v-for="roomLabel in roomLabels" :key="roomLabel" class="legend-item">
        <div
          class="legend-color"
          :style="{ backgroundColor: roomColors[roomLabels.indexOf(roomLabel)] }"
        ></div>
        <div class="legend-text">{{ roomLabel }} :</div>
        <div class="legend-value">
            <span class="legend-percentage"
              >{{
                (roomData[roomLabels.indexOf(roomLabel)] / totalBookings).toFixed(2) * 100
              }}%</span
            >
          </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 1.25rem;
  color: #2c3e50;
  font-weight: 600;
}

.card-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin-top: 4px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.metric-item {
  padding: 10px;
}

.metric-label {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #1e293b;
}

.metric-change {
  font-size: 0.875rem;
  margin-top: 4px;
}

.change-positive {
  color: #10b981;
}

.change-negative {
  color: #ef4444;
}

.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}

.period-selector {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.legend-text {
  font-size: 0.875rem;
  color: #64748b;
}

.legend-value {
  font-weight: 600;
  color: #1e293b;
}

.legend-percentage {
  color: #94a3b8;
  font-size: 0.75rem;
}
</style>
