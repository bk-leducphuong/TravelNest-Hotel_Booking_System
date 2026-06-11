<script>
import { mapActions } from 'vuex'
import { useToast } from 'vue-toastification'
import { UserService } from '@/services/user.service'
import { getImageUrl } from '@/utils/images'

const emptyProfile = () => ({
  name: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  address: '',
  country: '',
  nationality: '',
  gender: '',
  avatar: '',
})

export default {
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      isLoading: false,
      activeEditor: '',
      savingSection: '',
      profile: emptyProfile(),
      draft: emptyProfile(),
      genderOptions: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
        { value: 'other', label: 'Other' },
        { value: 'prefer_not_to_say', label: 'Prefer not to say' },
      ],
      isAvatarModalOpen: false,
      avatarFile: null,
      avatarPreview: '',
      isAvatarSaving: false,
    }
  },
  computed: {
    avatarUrl() {
      return getImageUrl(this.avatarPreview || this.profile.avatar)
    },
    formattedDateOfBirth() {
      if (!this.profile.dateOfBirth) {
        return 'Add your date of birth'
      }

      const date = new Date(this.profile.dateOfBirth)
      if (Number.isNaN(date.getTime())) {
        return 'Add your date of birth'
      }

      return date.toLocaleDateString('vi-VN')
    },
  },
  methods: {
    ...mapActions('user', ['retrieveUserInformation']),
    splitName(value) {
      const trimmedValue = String(value || '').trim()
      if (!trimmedValue) {
        return { firstName: '', lastName: '' }
      }

      const [firstName, ...lastNameParts] = trimmedValue.split(/\s+/)
      return {
        firstName,
        lastName: lastNameParts.join(' '),
      }
    },
    normalizeProfile(user) {
      const { firstName, lastName } = this.splitName(user.full_name)
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
      }
    },
    resetDraft() {
      this.draft = {
        ...this.profile,
      }
    },
    openEditor(section) {
      this.resetDraft()
      this.activeEditor = section
    },
    cancelEditor() {
      this.activeEditor = ''
      this.resetDraft()
    },
    getErrorMessage(error, fallbackMessage) {
      const apiError = error?.response?.data?.error
      const fieldMessages = apiError?.fields ? Object.values(apiError.fields) : []
      return fieldMessages[0] || apiError?.message || fallbackMessage
    },
    async loadUserInfo() {
      this.isLoading = true
      try {
        const response = await UserService.getCurrentUser()
        this.profile = this.normalizeProfile(response.data)
        this.resetDraft()
      } catch (error) {
        this.toast.error(this.getErrorMessage(error, 'Failed to load account details'))
      } finally {
        this.isLoading = false
      }
    },
    async saveProfile(payload, section, successMessage) {
      this.savingSection = section
      try {
        await UserService.updateCurrentUser(payload)
        await this.loadUserInfo()
        await this.retrieveUserInformation()
        this.activeEditor = ''
        this.toast.success(successMessage)
      } catch (error) {
        this.toast.error(this.getErrorMessage(error, 'Unable to save changes'))
      } finally {
        this.savingSection = ''
      }
    },
    saveName() {
      const fullName = `${this.draft.firstName} ${this.draft.lastName}`.trim()
      return this.saveProfile({ name: fullName }, 'name', 'Name updated')
    },
    saveEmail() {
      return this.saveProfile({ email: this.draft.email }, 'email', 'Email updated')
    },
    savePhoneNumber() {
      return this.saveProfile(
        { phoneNumber: this.draft.phoneNumber },
        'phoneNumber',
        'Phone number updated'
      )
    },
    saveDateOfBirth() {
      return this.saveProfile(
        { dateOfBirth: this.draft.dateOfBirth },
        'dateOfBirth',
        'Date of birth updated'
      )
    },
    saveAddress() {
      return this.saveProfile(
        {
          address: this.draft.address,
          country: this.draft.country,
        },
        'address',
        'Address updated'
      )
    },
    saveNationality() {
      return this.saveProfile(
        { nationality: this.draft.nationality },
        'nationality',
        'Nationality updated'
      )
    },
    saveGender() {
      return this.saveProfile({ gender: this.draft.gender }, 'gender', 'Gender updated')
    },
    openAvatarModal() {
      this.isAvatarModalOpen = true
      this.avatarFile = null
      this.avatarPreview = ''
    },
    closeAvatarModal() {
      if (this.avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(this.avatarPreview)
      }
      this.isAvatarModalOpen = false
      this.avatarFile = null
      this.avatarPreview = ''
    },
    handleAvatarSelection(event) {
      const [file] = event.target.files || []
      if (!file) {
        return
      }

      if (this.avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(this.avatarPreview)
      }
      this.avatarFile = file
      this.avatarPreview = URL.createObjectURL(file)
    },
    async saveAvatar() {
      if (!this.avatarFile) {
        return
      }

      const formData = new FormData()
      formData.append('avatar', this.avatarFile)

      this.isAvatarSaving = true
      try {
        await UserService.updateAvatar(formData)
        await this.loadUserInfo()
        await this.retrieveUserInformation()
        this.closeAvatarModal()
        this.toast.success('Avatar updated')
      } catch (error) {
        this.toast.error(this.getErrorMessage(error, 'Unable to upload avatar'))
      } finally {
        this.isAvatarSaving = false
      }
    },
  },
  async mounted() {
    await this.loadUserInfo()
  },
  beforeUnmount() {
    if (this.avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.avatarPreview)
    }
  },
}
</script>

<template>
  <section class="settings-panel">
    <header class="panel-header">
      <div>
        <h1>Personal details</h1>
        <p>Update profile details that are currently supported by the account API.</p>
      </div>
    </header>

    <div v-if="isLoading" class="empty-state">
      Loading your account details...
    </div>

    <template v-else>
      <div v-if="isAvatarModalOpen" class="modal-overlay" @click.self="closeAvatarModal">
        <div class="modal-card">
          <div class="modal-header">
            <h2>Update avatar</h2>
            <button type="button" class="ghost-button" @click="closeAvatarModal">Close</button>
          </div>

          <div class="avatar-preview">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar preview" />
            <div v-else class="avatar-fallback">No image</div>
          </div>

          <label class="upload-field">
            <span>Select image</span>
            <input type="file" accept="image/*" @change="handleAvatarSelection" />
          </label>

          <div class="modal-actions">
            <button type="button" class="secondary-button" @click="closeAvatarModal">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="!avatarFile || isAvatarSaving"
              @click="saveAvatar"
            >
              {{ isAvatarSaving ? 'Saving...' : 'Save avatar' }}
            </button>
          </div>
        </div>
      </div>

      <article class="detail-card detail-card-avatar">
        <div>
          <h2>Profile photo</h2>
          <p>Upload a profile image using the supported avatar endpoint.</p>
        </div>
        <div class="avatar-row">
          <div class="avatar-frame">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Profile avatar" />
            <div v-else class="avatar-fallback">No image</div>
          </div>
          <button type="button" class="secondary-button" @click="openAvatarModal">Change</button>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>Name</h2>
            <p>Stored as your full account name.</p>
          </div>
          <button
            v-if="activeEditor !== 'name'"
            type="button"
            class="secondary-button"
            @click="openEditor('name')"
          >
            Edit
          </button>
        </div>

        <div v-if="activeEditor === 'name'" class="editor-grid editor-grid-two">
          <label class="field">
            <span>First name</span>
            <input v-model.trim="draft.firstName" type="text" />
          </label>
          <label class="field">
            <span>Last name</span>
            <input v-model.trim="draft.lastName" type="text" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'name' || !draft.firstName || !draft.lastName"
              @click="saveName"
            >
              {{ savingSection === 'name' ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.name || 'Add your name' }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>Email address</h2>
            <p>This is used for sign-in and booking communications.</p>
          </div>
          <button
            v-if="activeEditor !== 'email'"
            type="button"
            class="secondary-button"
            @click="openEditor('email')"
          >
            Edit
          </button>
        </div>
        <div v-if="activeEditor === 'email'" class="editor-grid">
          <label class="field">
            <span>Email address</span>
            <input v-model.trim="draft.email" type="email" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'email' || !draft.email"
              @click="saveEmail"
            >
              {{ savingSection === 'email' ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.email || 'Add your email address' }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>Phone number</h2>
            <p>Use international format, for example <code>+12025550123</code>.</p>
          </div>
          <button
            v-if="activeEditor !== 'phoneNumber'"
            type="button"
            class="secondary-button"
            @click="openEditor('phoneNumber')"
          >
            Edit
          </button>
        </div>
        <div v-if="activeEditor === 'phoneNumber'" class="editor-grid">
          <label class="field">
            <span>Phone number</span>
            <input v-model.trim="draft.phoneNumber" type="text" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'phoneNumber' || !draft.phoneNumber"
              @click="savePhoneNumber"
            >
              {{ savingSection === 'phoneNumber' ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.phoneNumber || 'Add your phone number' }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>Date of birth</h2>
            <p>Stored as a date-only value in your profile.</p>
          </div>
          <button
            v-if="activeEditor !== 'dateOfBirth'"
            type="button"
            class="secondary-button"
            @click="openEditor('dateOfBirth')"
          >
            Edit
          </button>
        </div>
        <div v-if="activeEditor === 'dateOfBirth'" class="editor-grid">
          <label class="field">
            <span>Date of birth</span>
            <input v-model="draft.dateOfBirth" type="date" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'dateOfBirth' || !draft.dateOfBirth"
              @click="saveDateOfBirth"
            >
              {{ savingSection === 'dateOfBirth' ? 'Saving...' : 'Save' }}
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
            <h2>Address and country</h2>
            <p>These fields are stored separately in the new API.</p>
          </div>
          <button
            v-if="activeEditor !== 'address'"
            type="button"
            class="secondary-button"
            @click="openEditor('address')"
          >
            Edit
          </button>
        </div>
        <div v-if="activeEditor === 'address'" class="editor-grid">
          <label class="field">
            <span>Address</span>
            <textarea v-model.trim="draft.address" rows="3"></textarea>
          </label>
          <label class="field">
            <span>Country</span>
            <input v-model.trim="draft.country" type="text" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'address' || !draft.address || !draft.country"
              @click="saveAddress"
            >
              {{ savingSection === 'address' ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
        <div v-else class="value-row stacked">
          <span>{{ profile.address || 'Add your address' }}</span>
          <span class="muted-value">{{ profile.country || 'Add your country' }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>Nationality</h2>
            <p>This field maps directly to the current user profile resource.</p>
          </div>
          <button
            v-if="activeEditor !== 'nationality'"
            type="button"
            class="secondary-button"
            @click="openEditor('nationality')"
          >
            Edit
          </button>
        </div>
        <div v-if="activeEditor === 'nationality'" class="editor-grid">
          <label class="field">
            <span>Nationality</span>
            <input v-model.trim="draft.nationality" type="text" />
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'nationality' || !draft.nationality"
              @click="saveNationality"
            >
              {{ savingSection === 'nationality' ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.nationality || 'Add your nationality' }}</span>
        </div>
      </article>

      <article class="detail-card">
        <div class="detail-header">
          <div>
            <h2>Gender</h2>
            <p>Choose the supported option that should be stored on your profile.</p>
          </div>
          <button
            v-if="activeEditor !== 'gender'"
            type="button"
            class="secondary-button"
            @click="openEditor('gender')"
          >
            Edit
          </button>
        </div>
        <div v-if="activeEditor === 'gender'" class="editor-grid">
          <label class="field">
            <span>Gender</span>
            <select v-model="draft.gender">
              <option disabled value="">Select an option</option>
              <option v-for="option in genderOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <div class="editor-actions">
            <button type="button" class="secondary-button" @click="cancelEditor">Cancel</button>
            <button
              type="button"
              class="primary-button"
              :disabled="savingSection === 'gender' || !draft.gender"
              @click="saveGender"
            >
              {{ savingSection === 'gender' ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
        <div v-else class="value-row">
          <span>{{ profile.gender || 'Add your gender' }}</span>
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
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #fff;
}

.panel-header h1 {
  margin: 0 0 8px;
  font-size: 30px;
  color: #0f172a;
}

.panel-header p {
  margin: 0;
  color: #475569;
  line-height: 1.6;
}

.detail-card {
  padding: 24px 28px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
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
  font-size: 20px;
  color: #0f172a;
}

.detail-card p {
  margin: 0;
  color: #475569;
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
  color: #0f172a;
  font-size: 15px;
}

.value-row.stacked {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.muted-value {
  color: #64748b;
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
  background: #eff6ff;
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
  color: #64748b;
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
  border-radius: 8px;
  font-size: 14px;
  color: #0f172a;
  background: #fff;
}

.field textarea {
  resize: vertical;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.primary-button,
.secondary-button,
.ghost-button {
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.primary-button {
  padding: 11px 16px;
  border: none;
  background: #2563eb;
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
  color: #0f172a;
}

.ghost-button {
  padding: 0;
  border: none;
  background: transparent;
  color: #2563eb;
}

.empty-state {
  padding: 28px;
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #fff;
  color: #64748b;
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
  border-radius: 8px;
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
  color: #0f172a;
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
  border-radius: 6px;
  background: #eff6ff;
  color: #1d4ed8;
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
