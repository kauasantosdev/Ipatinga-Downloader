export function Footer() {
  return (
    <footer className="mt-16 py-8 border-t border-border/20">
      <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            © 2025 MusicDL. Feito para amantes da música.
          </p>
          <p className="text-xs text-muted-foreground">
            Respeite os direitos autorais e use apenas para música que você possui.
          </p>
        </div>
        
        <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
          <button className="hover:text-primary transition-colors">
            Termos de Uso
          </button>
          <button className="hover:text-primary transition-colors">
            Privacidade
          </button>
          <button className="hover:text-primary transition-colors">
            Suporte
          </button>
        </div>
      </div>
    </footer>
  );
}