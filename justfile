# iot-bee — Task Runner
# Docs: https://github.com/casey/just
#
# Uso:
#   just          → muestra todos los comandos disponibles
#   just setup    → configura el entorno de desarrollo desde cero

# Muestra los comandos disponibles por defecto
default:
    @just --list

# ── Setup ─────────────────────────────────────────────────────────────────────

# Configura el entorno de desarrollo completo (ejecutar una vez al clonar el repo)
setup: _check-os _install-rust _install-node _install-pnpm _install-hooks
    @echo ""
    @echo "✅ Setup completo. Ya puedes desarrollar en iot-bee."
    @echo "   → Backend:  cd app && cargo run"
    @echo "   → Frontend: cd web && pnpm dev"

# Verifica que el SO sea compatible
_check-os:
    @echo "🔍 Verificando sistema operativo..."
    @uname -s | grep -qE 'Linux|Darwin' || (echo "❌ Solo Linux y macOS son soportados" && exit 1)
    @echo "   OK: $(uname -s)"

# Instala Rust y Cargo via rustup si no están instalados
_install-rust:
    @echo "🦀 Verificando Rust..."
    @if ! command -v rustup > /dev/null 2>&1; then \
        echo "   Instalando rustup..."; \
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable; \
        echo "   ⚠️  Reinicia tu terminal o ejecuta: source $HOME/.cargo/env"; \
    else \
        echo "   OK: $(rustc --version)"; \
        rustup update stable; \
        echo "   OK: toolchain actualizado"; \
    fi
    @echo "   Verificando componentes..."
    @rustup component add rustfmt clippy 2>/dev/null || true

# Instala Node.js via nvm si no está instalado
_install-node:
    @echo "🟩 Verificando Node.js..."
    @if ! command -v node > /dev/null 2>&1; then \
        echo "   Instalando nvm + Node.js LTS..."; \
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash; \
        export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm install --lts; \
        echo "   ⚠️  Reinicia tu terminal para usar Node.js"; \
    else \
        echo "   OK: $(node --version)"; \
    fi

# Instala pnpm si no está instalado
_install-pnpm:
    @echo "📦 Verificando pnpm..."
    @if ! command -v pnpm > /dev/null 2>&1; then \
        echo "   Instalando pnpm..."; \
        npm install -g pnpm; \
    else \
        echo "   OK: pnpm $(pnpm --version)"; \
    fi

# Instala dependencias del workspace raíz y activa los git hooks (lefthook)
_install-hooks:
    @echo "🔗 Instalando dependencias y git hooks..."
    pnpm install --ignore-scripts
    pnpm lefthook install
    @echo "   OK: hooks activados (lefthook)"

# Instala dependencias del frontend
_install-web:
    @echo "📦 Instalando dependencias del frontend..."
    pnpm install --frozen-lockfile
    @echo "   OK: dependencias web instaladas"

# ── Desarrollo ────────────────────────────────────────────────────────────────

# Levanta el backend (Rust)
run-backend:
    cd app && RUST_LOG=info cargo run

# Levanta el frontend (Next.js), instala deps si es necesario
run-frontend: _install-web
    cd web && pnpm dev

# Levanta backend y frontend en paralelo
dev:
    @echo "🚀 Iniciando backend y frontend..."
    just run-backend & just run-frontend
