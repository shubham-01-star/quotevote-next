import { render, screen, fireEvent, waitFor, type MockedResponse } from '../../utils/test-utils'
import LoginPageContent from '@/app/auths/login/PageContent'
import { LOGIN_MUTATION } from '@/graphql/mutations'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (s: { setUserData: jest.Mock }) => unknown) =>
    selector({ setUserData: jest.fn() }),
}))

describe('LoginPageContent', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders email and password fields', () => {
    render(<LoginPageContent />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('shows validation errors on empty submit', async () => {
    render(<LoginPageContent />)
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('calls mutation on valid submit', async () => {
    const mocks: MockedResponse[] = [
      {
        request: {
          query: LOGIN_MUTATION,
          variables: { username: 'test@example.com', password: 'password123' },
        },
        result: {
          data: {
            login: {
              token: 'test-token',
              user: {
                _id: '1',
                id: '1',
                username: 'test',
                email: 'test@example.com',
                name: '',
                avatar: '',
                admin: false,
                accountStatus: 'active',
              },
            },
          },
        },
      },
    ]
    render(<LoginPageContent />, { mocks })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard/search'))
  })

  it('renders forgot password link', () => {
    render(<LoginPageContent />)
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
  })

  it('renders request access link', () => {
    render(<LoginPageContent />)
    expect(screen.getByText(/request access/i)).toBeInTheDocument()
  })
})
