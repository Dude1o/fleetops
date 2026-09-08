export class UserRoleResponseDto {
  name: string;
  permissions: string[];
}

export class UserRolesResponseDto {
  userId: string;
  roles: UserRoleResponseDto[];
}
