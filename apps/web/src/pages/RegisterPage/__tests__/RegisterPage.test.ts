import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "../index.vue";
import { loginUser, registerUser } from "../../../api/auth";
import { setAuthToken, setRefreshToken } from "../../../auth/token-storage";

const pushMock = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: pushMock
  })
}));

vi.mock("../../../api/auth", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn()
}));

vi.mock("../../../auth/token-storage", () => ({
  setAuthToken: vi.fn(),
  setRefreshToken: vi.fn()
}));

const mockedRegisterUser = vi.mocked(registerUser);
const mockedLoginUser = vi.mocked(loginUser);
const mockedSetAuthToken = vi.mocked(setAuthToken);
const mockedSetRefreshToken = vi.mocked(setRefreshToken);

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders registration form fields", () => {
    const wrapper = mount(RegisterPage);

    expect(wrapper.find('input[name="email"]').exists()).toBe(true);
    expect(wrapper.find('input[name="password"]').exists()).toBe(true);
    expect(wrapper.find('input[name="name"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("注册");
  });

  it("registers, logs in, stores tokens, and redirects to projects", async () => {
    mockedRegisterUser.mockResolvedValue({
      success: true,
      data: {
        id: "user-1",
        email: "new-user@example.com",
        name: "New User",
        createdAt: "2026-06-23T00:00:00.000Z",
        updatedAt: "2026-06-23T00:00:00.000Z"
      }
    });
    mockedLoginUser.mockResolvedValue({
      success: true,
      data: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        user: {
          id: "user-1",
          email: "new-user@example.com",
          name: "New User",
          createdAt: "2026-06-23T00:00:00.000Z",
          updatedAt: "2026-06-23T00:00:00.000Z"
        }
      }
    });

    const wrapper = mount(RegisterPage);

    await wrapper.get('input[name="email"]').setValue("new-user@example.com");
    await wrapper.get('input[name="password"]').setValue("password123");
    await wrapper.get('input[name="name"]').setValue("New User");
    await wrapper.get("form").trigger("submit");

    expect(mockedRegisterUser).toHaveBeenCalledWith({
      email: "new-user@example.com",
      password: "password123",
      name: "New User"
    });
    expect(mockedLoginUser).toHaveBeenCalledWith({
      email: "new-user@example.com",
      password: "password123"
    });
    expect(mockedSetAuthToken).toHaveBeenCalledWith("access-token");
    expect(mockedSetRefreshToken).toHaveBeenCalledWith("refresh-token");
    expect(pushMock).toHaveBeenCalledWith("/projects");
  });
});
