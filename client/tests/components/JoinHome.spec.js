import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import vi from '@/locales/vi.json'
import JoinHome from '@/views/JoinHome.vue'

const mountJoin = (locale) => {
  const i18n = createI18n({
    locale,
    fallbackLocale: 'en',
    messages: { en, vi },
  })
  const store = createStore({
    modules: {
      user: {
        namespaced: true,
        state: () => ({}),
        getters: { getUserLanguage: () => 'en-US' },
      },
    },
  })

  return mount(JoinHome, {
    global: { plugins: [i18n, store] },
  })
}

describe('JoinHome', () => {
  it('renders the English copy when the locale is en (#114)', () => {
    const wrapper = mountJoin('en')

    expect(wrapper.text()).toContain('Get started')
    expect(wrapper.text()).toContain('Sign up for free')
    expect(wrapper.text()).toContain('any kind of property')
    expect(wrapper.text()).toContain('Continue your registration')
    // LoginHeader strings
    expect(wrapper.text()).toContain('Already a partner?')
    expect(wrapper.text()).toContain('Log in')
  })

  it('renders the Vietnamese copy when the locale is vi (#114)', () => {
    const wrapper = mountJoin('vi')

    expect(wrapper.text()).toContain('Bắt đầu ngay')
    expect(wrapper.text()).toContain('Đăng ký miễn phí')
    expect(wrapper.text()).toContain('Tiếp tục các bước đăng ký')
  })

  it('points the continue-registration link at the host app login (#114)', () => {
    const wrapper = mountJoin('en')

    const link = wrapper.find('.login-link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toMatch(/\/login$/)
  })
})
