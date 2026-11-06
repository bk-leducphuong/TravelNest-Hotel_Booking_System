<script>
  import Header from '@/components/Header.vue';
  import Footer from '@/components/Footer.vue';
  import BookingRecord from '@/components/booking/BookingRecord.vue';
  export default { name: 'BookingConfirmation', components: { Header, Footer, BookingRecord } };
</script>
<template>
  <Header :is-search-open="false" /><BookingRecord
    :code="String($route.query.bookingCode || '')"
  /><Footer />
</template>
