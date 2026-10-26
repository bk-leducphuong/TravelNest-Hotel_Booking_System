<script>
  import { mapActions } from 'vuex';
  import sectionFeedback from '@/mixins/sectionFeedback';
  import { UserService } from '@/services/user.service';
  import { getImageUrl } from '@/utils/images';
  import { COUNTRIES, DEFAULT_DIAL_CODE, splitPhoneNumber } from '@/constants/countries';

  const emptyProfile = () => ({
    name: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    phoneDial: DEFAULT_DIAL_CODE,
    phoneNational: '',
    dateOfBirth: '',
    address: '',
    country: '',
    nationality: '',
    gender: '',
    avatar: '',
  });

  export default {
    mixins: [sectionFeedback],
    data() {
      return {
        loadError: false,
        isLoading: false,
        activeEditor: '',
        savingSection: '',
        profile: emptyProfile(),
        draft: emptyProfile(),
        countries: COUNTRIES,
        genderOptions: [
          { value: 'male', labelKey: 'account.personal.genderOptions.male' },
          { value: 'female', labelKey: 'account.personal.genderOptions.female' },
          { value: 'other', labelKey: 'account.personal.genderOptions.other' },
          {
            value: 'prefer_not_to_say',
            labelKey: 'account.personal.genderOptions.preferNotToSay',
          },
        ],
        isAvatarModalOpen: false,
        avatarFile: null,
        avatarPreview: '',
        isAvatarSaving: false,
      };
    },
    computed: {
      avatarUrl() {
        return getImageUrl(this.avatarPreview || this.profile.avatar);
      },
      // E.164-ish; matches the server's phoneNumber schema.
      isPhoneValid() {
        const national = (this.draft.phoneNational || '').replace(/\D/g, '');
        if (!national) return false;
        const composed = `${this.draft.phoneDial || DEFAULT_DIAL_CODE}${national}`;
        return /^\+?[1-9]\d{1,14}$/.test(composed);
      },
      formattedDateOfBirth() {
        if (!this.profile.dateOfBirth) {
          return this.$t('account.personal.addDateOfBirth');
        }

        const date = new Date(this.profile.dateOfBirth);
        if (Number.isNaN(date.getTime())) {
          return this.$t('account.personal.addDateOfBirth');
        }

        return date.toLocaleDateString(this.$i18n.locale);
      },
    },
    methods: {
      ...mapActions('user', ['retrieveUserInformation']),
      splitName(value) {
        const trimmedValue = String(value || '').trim();
        if (!trimmedValue) {
          return { firstName: '', lastName: '' };
        }

        const [firstName, ...lastNameParts] = trimmedValue.split(/\s+/);
        return {
          firstName,
          lastName: lastNameParts.join(' '),
        };
      },
      normalizeProfile(user) {
        const { firstName, lastName } = this.splitName(user.full_name);
        return {
          name: user.full_name || '',
          firstName,
          lastName,
          email: user.email || '',
          phoneNumber: user.phone_number || '',
          dateOfBirth: user.date_of_birth || '',
          address: user.address || '',
          country: user.country || '',
          nationality: user.nationality || '',
          gender: user.gender || '',
          avatar: user.profile_picture_url || '',
        };
      },
      resetDraft() {
        this.draft = {
          ...this.profile,
        };
      },
      openEditor(section) {
        this.resetDraft();
        if (section === 'phoneNumber') {
          const { dial, national } = splitPhoneNumber(this.draft.phoneNumber);
          this.draft.phoneDial = dial;
          this.draft.phoneNational = national;
        }
        this.activeEditor = section;
      },
      cancelEditor() {
        this.activeEditor = '';
        this.resetDraft();
      },
      async loadUserInfo() {
        this.loadError = false;
        this.isLoading = true;
        try {
          const response = await UserService.getCurrentUser();
          this.profile = this.normalizeProfile(response.data);
          this.resetDraft();
        } catch (error) {
          this.loadError = true;
        } finally {
          this.isLoading = false;
        }
      },
      async saveProfile(payload, section, successMessage) {
        this.clearFeedback();
        this.savingSection = section;
        try {
          await UserService.updateCurrentUser(payload);
          await this.loadUserInfo();
          await this.retrieveUserInformation();
          this.activeEditor = '';
          this.showSuccess(successMessage);
        } catch (error) {
          this.showError(this.$t('account.personal.errors.save'));
        } finally {
          this.savingSection = '';
        }
      },
      saveName() {
        const fullName = `${this.draft.firstName} ${this.draft.lastName}`.trim();
        return this.saveProfile(
          { name: fullName },
          'name',
          this.$t('account.personal.toasts.nameUpdated')
        );
      },
      saveEmail() {
        return this.saveProfile(
          { email: this.draft.email },
          'email',
          this.$t('account.personal.toasts.emailUpdated')
        );
      },
      savePhoneNumber() {
        const national = (this.draft.phoneNational || '').replace(/\D/g, '');
        const phoneNumber = national ? `${this.draft.phoneDial}${national}` : '';
        return this.saveProfile(
          { phoneNumber },
          'phoneNumber',
          this.$t('account.personal.toasts.phoneUpdated')
        );
      },
      saveDateOfBirth() {
        return this.saveProfile(
          { dateOfBirth: this.draft.dateOfBirth },
          'dateOfBirth',
          this.$t('account.personal.toasts.dobUpdated')
        );
      },
      saveAddress() {
        return this.saveProfile(
          {
            address: this.draft.address,
            country: this.draft.country,
          },
          'address',
          this.$t('account.personal.toasts.addressUpdated')
        );
      },
      saveNationality() {
        return this.saveProfile(
          { nationality: this.draft.nationality },
          'nationality',
          this.$t('account.personal.toasts.nationalityUpdated')
        );
      },
      saveGender() {
        return this.saveProfile(
          { gender: this.draft.gender },
          'gender',
          this.$t('account.personal.toasts.genderUpdated')
        );
      },
      openAvatarModal() {
        this.isAvatarModalOpen = true;
        this.avatarFile = null;
        this.avatarPreview = '';
      },
      closeAvatarModal() {
        if (this.avatarPreview?.startsWith('blob:')) {
          URL.revokeObjectURL(this.avatarPreview);
        }
        this.isAvatarModalOpen = false;
        this.avatarFile = null;
        this.avatarPreview = '';
      },
      handleAvatarSelection(event) {
        const [file] = event.target.files || [];
        if (!file) {
          return;
        }

        if (this.avatarPreview?.startsWith('blob:')) {
          URL.revokeObjectURL(this.avatarPreview);
        }
        this.avatarFile = file;
        this.avatarPreview = URL.createObjectURL(file);
      },
      async saveAvatar() {
        this.clearFeedback();
        if (!this.avatarFile) {
          return;
        }

        const formData = new FormData();
        formData.append('avatar', this.avatarFile);

        this.isAvatarSaving = true;
        try {
          await UserService.updateAvatar(formData);
          await this.loadUserInfo();
          await this.retrieveUserInformation();
          this.closeAvatarModal();
          this.showSuccess(this.$t('account.personal.toasts.avatarUpdated'));
        } catch (error) {
          this.showError(this.$t('account.personal.errors.avatar'));
        } finally {
          this.isAvatarSaving = false;
        }
      },
    },
    async mounted() {
      await this.loadUserInfo();
    },
    beforeUnmount() {
      if (this.avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(this.avatarPreview);
      }
    },
  };
</script>

<template>
  <section class="settings-panel">
    <FeedbackMessage
      v-if="feedback && !isAvatarModalOpen"
      v-bind="feedback"
      @dismiss="clearFeedback"
    />
    <header class="panel-header">
      <div>
        <h1>{{ $t('account.personal.title') }}</h1>
        <p>{{ $t('account.personal.description') }}</p>
      </div>
    </header>

    <div v-if="isLoading" class="empty-state">
      {{ $t('account.personal.loading') }}
    </div>

    <FeedbackMessage
      v-else-if="loadError"
      :message="$t('account.personal.errors.load')"
      retryable
      @retry="loadUserInfo"
    />

    <template v-else>
      <el-dialog
        v-model="isAvatarModalOpen"
        :title="$t('account.personal.avatarModal.title')"
        width="560px"
        @close="closeAvatarModal"
      >
        <div class="avatar-dialog-content">
          <FeedbackMessage v-if="feedback" v-bind="feedback" @dismiss="clearFeedback" />
          <div class="modal-header">
            <h2>{{ $t('account.personal.avatarModal.title') }}</h2>
            <button type="button" class="ghost-button" @click="closeAvatarModal">
              {{ $t('account.common.close') }}
            </button>
          </div>

          <div class="avatar-preview">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar preview" />
            <div v-else class="avatar-fallback">{{ $t('account.personal.noImage') }}</div>
          </div>

          <label class="upload-field">
            <span>{{ $t('account.personal.selectImage') }}</span>
            <input type="file" accept="image/*" @change="handleAvatarSelection" />
          </label>

          <div class="modal-actions">
            <button type="button" class="secondary-button" @click="closeAvatarModal">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="!avatarFile || isAvatarSaving"
              @click="saveAvatar"
            >
              {{
                isAvatarSaving
                  ? $t('account.common.saving')
                  : $t('account.personal.avatarModal.save')
              }}
            </button>
          </div>
        </div>
      </el-dialog>

      <article class="detail-card detail-card-avatar">
        <div>
          <h2>{{ $t('account.personal.photo.title') }}</h2>
          <p>{{ $t('account.personal.photo.description') }}</p>
        </div>
        <div class="avatar-row">
          <div class="avatar-frame">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Profile avatar" />
            <div v-else class="avatar-fallback">{{ $t('account.personal.noImage') }}</div>
          </div>
          <button type="button" class="secondary-button" @click="openAvatarModal">
            {{ $t('account.common.change') }}
          </button>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>{{ $t('account.personal.name.title') }}</h2>
            <p>{{ $t('account.personal.name.description') }}</p>
          </div>
          <button
            v-if="activeEditor !== 'name'"
            type="button"
            class="secondary-button"
            @click="openEditor('name')"
          >
            {{ $t('account.common.edit') }}
          </button>
        </div>

        <div v-if="activeEditor === 'name'" class="editor-grid editor-grid-two">
          <label class="field">
            <span>{{ $t('account.personal.name.firstName') }}</span>
            <input v-model.trim="draft.firstName" type="text" />
          </label>
          <label class="field">
            <span>{{ $t('account.personal.name.lastName') }}</span>
            <input v-model.trim="draft.lastName" type="text" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'name' || !draft.firstName || !draft.lastName"
              @click="saveName"
            >
              {{
                savingSection === 'name' ? $t('account.common.saving') : $t('account.common.save')
              }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.name || $t('account.personal.name.empty') }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>{{ $t('account.personal.email.title') }}</h2>
            <p>{{ $t('account.personal.email.description') }}</p>
          </div>
          <button
            v-if="activeEditor !== 'email'"
            type="button"
            class="secondary-button"
            @click="openEditor('email')"
          >
            {{ $t('account.common.edit') }}
          </button>
        </div>
        <div v-if="activeEditor === 'email'" class="editor-grid">
          <label class="field">
            <span>{{ $t('account.personal.email.title') }}</span>
            <input v-model.trim="draft.email" type="email" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'email' || !draft.email"
              @click="saveEmail"
            >
              {{
                savingSection === 'email' ? $t('account.common.saving') : $t('account.common.save')
              }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.email || $t('account.personal.email.empty') }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>{{ $t('account.personal.phone.title') }}</h2>
            <p>{{ $t('account.personal.phone.description') }}</p>
          </div>
          <button
            v-if="activeEditor !== 'phoneNumber'"
            type="button"
            class="secondary-button"
            @click="openEditor('phoneNumber')"
          >
            {{ $t('account.common.edit') }}
          </button>
        </div>
        <div v-if="activeEditor === 'phoneNumber'" class="editor-grid">
          <label class="field">
            <span>{{ $t('account.personal.phone.countryCode') }}</span>
            <select v-model="draft.phoneDial" class="country-select">
              <option v-for="country in countries" :key="country.iso2" :value="country.dial">
                {{ country.name }} ({{ country.dial }})
              </option>
            </select>
          </label>
          <label class="field">
            <span>{{ $t('account.personal.phone.title') }}</span>
            <input
              v-model.trim="draft.phoneNational"
              type="tel"
              inputmode="numeric"
              placeholder="912345678"
            />
          </label>
          <p v-if="draft.phoneNational && !isPhoneValid" class="field-error">
            {{ $t('account.personal.phone.invalid') }}
          </p>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'phoneNumber' || !isPhoneValid"
              @click="savePhoneNumber"
            >
              {{
                savingSection === 'phoneNumber'
                  ? $t('account.common.saving')
                  : $t('account.common.save')
              }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.phoneNumber || $t('account.personal.phone.empty') }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>{{ $t('account.personal.dob.title') }}</h2>
            <p>{{ $t('account.personal.dob.description') }}</p>
          </div>
          <button
            v-if="activeEditor !== 'dateOfBirth'"
            type="button"
            class="secondary-button"
            @click="openEditor('dateOfBirth')"
          >
            {{ $t('account.common.edit') }}
          </button>
        </div>
        <div v-if="activeEditor === 'dateOfBirth'" class="editor-grid">
          <label class="field">
            <span>{{ $t('account.personal.dob.title') }}</span>
            <input v-model="draft.dateOfBirth" type="date" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'dateOfBirth' || !draft.dateOfBirth"
              @click="saveDateOfBirth"
            >
              {{
                savingSection === 'dateOfBirth'
                  ? $t('account.common.saving')
                  : $t('account.common.save')
              }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ formattedDateOfBirth }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>{{ $t('account.personal.address.title') }}</h2>
            <p>{{ $t('account.personal.address.description') }}</p>
          </div>
          <button
            v-if="activeEditor !== 'address'"
            type="button"
            class="secondary-button"
            @click="openEditor('address')"
          >
            {{ $t('account.common.edit') }}
          </button>
        </div>
        <div v-if="activeEditor === 'address'" class="editor-grid">
          <label class="field">
            <span>{{ $t('account.personal.address.label') }}</span>
            <textarea v-model.trim="draft.address" rows="3"></textarea>
          </label>
          <label class="field">
            <span>{{ $t('account.personal.address.country') }}</span>
            <select v-model="draft.country" class="country-select">
              <option value="">{{ $t('account.personal.selectCountry') }}</option>
              <option v-for="country in countries" :key="country.iso2" :value="country.name">
                {{ country.name }}
              </option>
            </select>
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'address' || !draft.address || !draft.country"
              @click="saveAddress"
            >
              {{
                savingSection === 'address'
                  ? $t('account.common.saving')
                  : $t('account.common.save')
              }}
            </button>
          </div>
        </div>
        <div v-else class="value-row stacked">
          <span>{{ profile.address || $t('account.personal.address.emptyAddress') }}</span>
          <span class="muted-value">
            {{ profile.country || $t('account.personal.address.emptyCountry') }}
          </span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>{{ $t('account.personal.nationality.title') }}</h2>
            <p>{{ $t('account.personal.nationality.description') }}</p>
          </div>
          <button
            v-if="activeEditor !== 'nationality'"
            type="button"
            class="secondary-button"
            @click="openEditor('nationality')"
          >
            {{ $t('account.common.edit') }}
          </button>
        </div>
        <div v-if="activeEditor === 'nationality'" class="editor-grid">
          <label class="field">
            <span>{{ $t('account.personal.nationality.title') }}</span>
            <select v-model="draft.nationality" class="country-select">
              <option value="">{{ $t('account.personal.selectCountry') }}</option>
              <option v-for="country in countries" :key="country.iso2" :value="country.name">
                {{ country.name }}
              </option>
            </select>
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'nationality' || !draft.nationality"
              @click="saveNationality"
            >
              {{
                savingSection === 'nationality'
                  ? $t('account.common.saving')
                  : $t('account.common.save')
              }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.nationality || $t('account.personal.nationality.empty') }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>{{ $t('account.personal.gender.title') }}</h2>
            <p>{{ $t('account.personal.gender.description') }}</p>
          </div>
          <button
            v-if="activeEditor !== 'gender'"
            type="button"
            class="secondary-button"
            @click="openEditor('gender')"
          >
            {{ $t('account.common.edit') }}
          </button>
        </div>
        <div v-if="activeEditor === 'gender'" class="editor-grid">
          <label class="field">
            <span>{{ $t('account.personal.gender.title') }}</span>
            <select v-model="draft.gender">
              <option disabled value="">{{ $t('account.personal.gender.selectOption') }}</option>
              <option v-for="option in genderOptions" :key="option.value" :value="option.value">
                {{ $t(option.labelKey) }}
              </option>
            </select>
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">
              {{ $t('account.common.cancel') }}
            </button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'gender' || !draft.gender"
              @click="saveGender"
            >
              {{
                savingSection === 'gender' ? $t('account.common.saving') : $t('account.common.save')
              }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.gender || $t('account.personal.gender.empty') }}</span>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
  .settings-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .panel-header {
    padding: 28px;
    border: 1px solid var(--tn-border);
    border-radius: 20px;
    background: #fff;
  }

  .panel-header h1 {
    margin: 0 0 8px;
    font-size: 24px;
    line-height: 1.3;
    color: var(--tn-ink);
  }

  .panel-header p {
    margin: 0;
    color: var(--tn-muted);
    line-height: 1.6;
  }

  .detail-card {
    padding: 24px 28px;
    border: 1px solid var(--tn-border);
    border-radius: 20px;
    background: #fff;
  }

  .detail-card-avatar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .detail-card h2 {
    margin: 0 0 8px;
    font-size: 16px;
    line-height: 1.4;
    color: var(--tn-ink);
  }

  .detail-card p {
    margin: 0;
    color: var(--tn-muted);
    line-height: 1.55;
  }

  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .value-row {
    color: var(--tn-ink);
    font-size: 15px;
  }

  .value-row.stacked {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .muted-value {
    color: var(--tn-muted);
  }

  .avatar-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .avatar-frame,
  .avatar-preview {
    width: 104px;
    height: 104px;
    border-radius: 999px;
    overflow: hidden;
    border: 3px solid #dbeafe;
    background: var(--tn-soft);
  }

  .avatar-frame img,
  .avatar-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--tn-muted);
    font-size: 13px;
    font-weight: 600;
  }

  .editor-grid {
    display: grid;
    gap: 16px;
  }

  .editor-grid-two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    display: grid;
    gap: 8px;
  }

  .field span {
    color: #334155;
    font-size: 14px;
    font-weight: 600;
  }

  .field input,
  .field textarea,
  .field select {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid #cbd5e1;
    border-radius: 20px;
    font-size: 14px;
    color: var(--tn-ink);
    background: #fff;
  }

  .field textarea {
    resize: vertical;
  }

  .field-error {
    margin: 0;
    color: #b3261e;
    font-size: 13px;
  }

  .editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .primary-button,
  .secondary-button,
  .ghost-button {
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .primary-button {
    padding: 11px 16px;
    border: none;
    background: var(--tn-action);
    color: #fff;
  }

  .primary-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .secondary-button {
    padding: 11px 16px;
    border: 1px solid #cbd5e1;
    background: #fff;
    color: var(--tn-ink);
  }

  .ghost-button {
    padding: 0;
    border: none;
    background: transparent;
    color: var(--tn-action);
  }

  .empty-state {
    padding: 28px;
    border: 1px solid var(--tn-border);
    border-radius: 20px;
    background: #fff;
    color: var(--tn-muted);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.56);
    z-index: 1000;
  }

  .modal-card {
    width: min(100%, 420px);
    padding: 24px;
    border-radius: 20px;
    background: #fff;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 22px;
    color: var(--tn-ink);
  }

  .upload-field {
    display: grid;
    gap: 10px;
    margin-top: 20px;
    color: #334155;
    font-size: 14px;
    font-weight: 600;
  }

  .upload-field input {
    font-size: 14px;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
  }

  code {
    padding: 2px 6px;
    border-radius: 10px;
    background: var(--tn-soft);
    color: var(--tn-hover);
  }

  @media (max-width: 768px) {
    .panel-header,
    .detail-card {
      padding: 20px;
    }

    .detail-card-avatar,
    .detail-header,
    .avatar-row,
    .editor-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .editor-grid-two {
      grid-template-columns: 1fr;
    }
  }
</style>
