<script>
import AdminHeader from '@/components/admin/AdminHeader.vue'
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import WithdrawConfirmation from '@/components/admin/payment/withdrawConfirmation.vue'
import axios from 'axios'
import { mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
import socket from '@/services/socket'
import Loading from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    AdminHeader,
    DashboardMenu,
    WithdrawConfirmation,
    Loading
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      invoices: [],
      isWithdrawConfirmationPopupOpen: false,
      withdrawAmount: 0,
      withdrawTransactionId: 0,
      isLoading: false
    }
  },
  computed: {
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId'])
  },
  methods: {
    async getInvoices() {
      try {
        this.isLoading = true
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/payout`,
          {
            hotelId: this.getCurrentManagingHotelId
          },
          {
            withCredentials: true
          }
        )
        this.invoices = response.data.invoices
      } catch (error) {
        errorHandler(error);
      } finally {
        this.isLoading = false
      }
    },
    seeInvoiceDetails(invoiceId) {
      this.$router.push({
        path: `/admin/${this.getCurrentManagingHotelId}/payment/invoice-details`,
        query: { invoiceId: invoiceId }
      })
    },
    openWithdrawConfirmationPopup(amount, transaction_id) {
      this.withdrawAmount = amount
      this.withdrawTransactionId = transaction_id
      this.isWithdrawConfirmationPopupOpen = true
    },
    closeWithdrawConfirmationPopup() {
      this.isWithdrawConfirmationPopupOpen = false
    },
    isButtonDisabled(invoice) {
      if (
        invoice.status == 'unavailable' ||
        invoice.status == 'done' ||
        invoice.status == 'pending'
      ) {
        return true
      } else {
        return false
      }
    }
  },
  async mounted() {
    socket.on('payout-completed', async (data) => {
      this.toast.success('Payout successful!')

      this.invoices.forEach((invoice) => {
        if (invoice.transaction_id == data.transactionId) {
          invoice.status = 'done'
        }
      })
    })
    socket.on('payout-failed', async (data) => {
      this.toast.error('Payout failed!')
    })

    await this.getInvoices()
  }
}
</script>
<template>
  <WithdrawConfirmation
    :withdrawAmount="withdrawAmount"
    :withdrawTransactionId="withdrawTransactionId"
    :hotelId="getCurrentManagingHotelId"
    v-if="isWithdrawConfirmationPopupOpen"
    @close="closeWithdrawConfirmationPopup"
  />
  <div class="invoice-list-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <AdminHeader />

      <div class="main-content">
        <Loading
          v-model:active="isLoading"
          :can-cancel="true"
          :on-cancel="onCancel"
          :color="`#003b95`"
          :is-full-page="false"
        />
        <!--Table-->
        <div class="table">
          <div class="container">
            <div class="table-total">
              <div class="table-title">
                <div class="title">
                  <div class="title-total">
                    <div class="title-method">
                      <h3>Invoices</h3>
                      <p>You have total {{ invoices.length }} invoices.</p>
                    </div>
                  </div>
                </div>
                <div class="actions">
                  <select class="bulk-action" @change="arrangeBookings($event.target.value)">
                    <option value="all">Tất cả</option>
                    <option value="today">Hôm nay</option>
                    <option value="last-week">1 tuần trước</option>
                    <option value="last-month">1 tháng trước</option>
                    <option value="last-year">1 năm trước</option>
                  </select>
                </div>
              </div>
              <div class="table-content">
                <table>
                  <thead>
                    <tr>
                      <td>Payment id</td>
                      <td>Date</td>
                      <td>Amount</td>
                      <td>Status</td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="invoice in invoices" :key="invoice.invoice_id">
                      <td class="payment-id">#{{ invoice.invoice_id }}</td>
                      <td class="time">
                        <p>{{ new Date(invoice.updated_at).toDateString() }}</p>
                      </td>
                      <td class="usd">
                        {{ parseInt(invoice.amount).toLocaleString('vi-VN') }} VND
                      </td>
                      <td class="status">
                        <ul>
                          <li
                            :style="{
                              color:
                                invoice.status == 'available' || invoice.status == 'done'
                                  ? 'green'
                                  : 'red'
                            }"
                          >
                            {{ invoice.status }}
                          </li>
                        </ul>
                      </td>
                      <td class="icon">
                        <button class="view" @click="seeInvoiceDetails(invoice.invoice_id)">
                          View
                        </button>
                      </td>
                      <td class="icon">
                        <button
                          class="withdraw-btn"
                          :class="{ disabled: isButtonDisabled(invoice) }"
                          :disabled="invoice.status == 'unavailable' || invoice.status == 'done'"
                          @click="
                            openWithdrawConfirmationPopup(invoice.amount, invoice.transaction_id)
                          "
                        >
                          Withdraw
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!--end Table-->
  </div>
</template>
<style scoped>
.invoice-list-container {
  display: flex;
}
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}
.main-content {
  padding: 24px;
  position: relative;
}
/* Title*/
.title-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title-method p {
  color: #777;
  /* font-weight: 600; */
}

.title-add button {
  color: #fff;
  background-color: #1d5fc2;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 5px;
  font-size: 20px;
  border: none;
  transition: all 0.25s;
  border: 1px solid #1d5fc2;
}

.title-add {
  position: relative;
}

.title-add button:hover {
  background-color: #003b95;
}

.title-add-method {
  display: none;
  position: absolute;
  width: 200px;
  right: 0;
  top: 110%;
  background-color: #fff;
  border-radius: 5px;
  box-shadow: 1px 2px 3px 1px #ddd;
}

.title-add-method p {
  margin: 0;
  padding: 10px;
  cursor: pointer;
}

.title-add-method p:hover {
  background-color: #1d5fc218;
}

.title-form {
  display: none;
  position: fixed;
  width: 50vw;
  left: 25%;
  background-color: #fff;
  padding: 20px 30px;
  border-radius: 8px;
  box-shadow: 1px 2px 3px 1px #ddd;
  z-index: 10 !important;
  top: 20%;
}

.actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.bulk-action {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: white;
  color: #718096;
  cursor: pointer;
}

.title-form p {
  font-size: 24px;
}

.title-form input {
  margin-bottom: 20px;
}

.title-form select {
  margin-bottom: 20px;
}

.title-form .cancel {
  background-color: #fff;
  color: #1d5fc2;
  border: none;
}

.title-form .cancel:hover {
  color: #003b95;
  background-color: #fff;
}
/* end Title*/

/*Table*/
tbody tr td {
  text-align: center;
}
.table-content {
  width: 100%;
}

.table-total {
  background-color: white;
  padding: 20px 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  /* box-shadow: 1px 2px 3px 1px #ddd; */
}

.table-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.table-title p {
  font-size: 16px;
  margin: 0;
}

.table-icon i {
  padding: 0 10px;
}

.table-icon i:first-child {
  border-right: 1px solid #ddd;
}

table {
  width: 100%;
}
table .setting {
  position: relative;
}

.update-method {
  display: none;
  position: absolute;
  width: 100px;
  right: 8px;
  top: 60%;
  background-color: #fff;
  border-radius: 5px;
  /* box-shadow: 1px 2px 3px 1px #ddd; */
}

i {
  cursor: pointer;
}

.setting i {
  cursor: pointer;
}

.update-method p {
  margin: 0;
  padding: 10px;
  cursor: pointer;
}

.update-method p:hover {
  background-color: #1d5fc218;
}

table thead td {
  text-align: center;
  font-weight: 600;
  color: #777;
}

.payment-id {
  color: #003b95;
  font-weight: 600;
}

.usd {
  font-weight: 600;
  font-size: 18px;
}

.icon i {
  color: #003b95;
  margin-right: 10px;
}

.icon .view {
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
}
.icon .view:hover {
  background-color: #1d5fc2;
  color: white;
}

.withdraw-btn {
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
  background-color: #1d5fc2;
  color: white;
}

.withdraw-btn:hover {
  background-color: #003b95;
}

.disabled {
  background-color: #e0e0e0;
  color: #8a8d91;
}

.disabled:hover {
  background-color: #e0e0e0;
  color: #8a8d91;
}

.vl-parent {
  position: relative;
  height: 100%;
  width: 100%;
}

/*end Table*/
</style>
