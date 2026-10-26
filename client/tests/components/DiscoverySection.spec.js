import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import DiscoverySection from '@/components/home/DiscoverySection.vue';
import en from '@/locales/en.json';
import vietnamese from '@/locales/vi.json';

const wrappers = [];
function render(sectionKey = 'hotels', locale = 'en') {
  const wrapper = mount(DiscoverySection, {
    props: {
      title: 'Trending Hotels',
      sectionKey,
      items: Array.from({ length: 10 }, (_, id) => ({ id })),
    },
    slots: {
      default:
        '<template #default="{ items }"><article v-for="item in items" :key="item.id">Hotel {{ item.id }}</article></template>',
    },
    global: { plugins: [createI18n({ legacy: false, locale, messages: { en, vi: vietnamese } })] },
  });
  wrappers.push(wrapper);
  return wrapper;
}
const button = (wrapper, text) => wrapper.findAll('button').find((el) => el.text() === text);

beforeEach(() => localStorage.clear());
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.restoreAllMocks();
});

describe('DiscoverySection', () => {
  it('defaults to a row, paginates the grid, and resets when switching back', async () => {
    const wrapper = render();
    expect(wrapper.find('.discovery-items--row').exists()).toBe(true);
    await button(wrapper, 'Grid').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(4);
    await button(wrapper, 'Show more').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(8);
    await button(wrapper, 'Show more').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(10);
    expect(button(wrapper, 'Show more')).toBeUndefined();
    await button(wrapper, 'Show less').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(4);
    await button(wrapper, 'Row').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(10);
  });

  it('remembers preferences independently for each section', async () => {
    await button(render(), 'Grid').trigger('click');
    const restored = render();
    await flushPromises();
    expect(restored.find('.discovery-items--grid').exists()).toBe(true);
    expect(render('destinations').find('.discovery-items--row').exists()).toBe(true);
  });

  it('keeps working when local storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Blocked');
    });
    const wrapper = render();
    await button(wrapper, 'Grid').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(4);
  });

  it('only shows navigation for overflow and disables arrows at the boundaries', async () => {
    const wrapper = render();
    await flushPromises();
    expect(wrapper.find('.row-navigation').exists()).toBe(false);
    const track = wrapper.find('.discovery-items');
    Object.defineProperties(track.element, {
      clientWidth: { value: 1000 },
      scrollWidth: { value: 2500 },
    });
    track.element.scrollBy = vi.fn();
    await track.trigger('scroll');
    const [previous, next] = wrapper.findAll('.row-navigation button');
    expect(previous.element.disabled).toBe(true);
    expect(next.element.disabled).toBe(false);
    await next.trigger('click');
    expect(track.element.scrollBy).toHaveBeenCalledWith({ left: 850, behavior: 'smooth' });
    track.element.scrollLeft = 1500;
    await track.trigger('scroll');
    expect(previous.element.disabled).toBe(false);
    expect(next.element.disabled).toBe(true);
    await track.trigger('keydown', { key: 'ArrowLeft' });
    expect(track.element.scrollBy).toHaveBeenLastCalledWith({ left: -850, behavior: 'smooth' });
  });

  it('updates navigation when asynchronous results arrive and hides controls while loading', async () => {
    const wrapper = render();
    await wrapper.setProps({ busy: true, items: [] });
    expect(wrapper.find('.discovery-controls').exists()).toBe(false);
    expect(wrapper.attributes('aria-busy')).toBe('true');
    await wrapper.setProps({ busy: false, items: [{ id: 1 }] });
    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.find('.discovery-controls').exists()).toBe(true);
  });

  it('renders translated layout controls', () => {
    const wrapper = render('hotels', 'vi');
    expect(button(wrapper, 'Hàng ngang').attributes('aria-pressed')).toBe('true');
    expect(button(wrapper, 'Lưới').exists()).toBe(true);
  });
});
