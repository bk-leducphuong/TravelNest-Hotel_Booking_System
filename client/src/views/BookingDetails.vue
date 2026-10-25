<script>
  import Header from '@/components/Header.vue';
  import Footer from '@/components/Footer.vue';
  import BookingRecord from '@/components/booking/BookingRecord.vue';
  export default { name: 'BookingDetails', components: { Header, Footer, BookingRecord } };
</script>
<template>
  <Header :is-search-open="false" /><BookingRecord
    :code="String($route.params.bookingCode || '')"
  /><Footer />
</template>
