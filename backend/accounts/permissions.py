from rest_framework import permissions


class IsVendedor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.papel in ['vendedor', 'subgerente', 'gerente', 'administrador']
        )


class IsSubgerente(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.papel in ['subgerente', 'gerente', 'administrador']
        )


class IsGerente(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.papel in ['gerente', 'administrador']
        )


class IsAdministrador(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_admin
        )
