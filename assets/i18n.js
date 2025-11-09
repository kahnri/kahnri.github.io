(function(global){
  'use strict';

  const DICT = {
    landing: {
      tr: {
        'nav.blog': 'Blog',
        'hero.title': 'Makine Mühendisliği (ITPL) · Veri & Lojistik',
        'hero.subtitle': 'Werkstudent / Staj / Junior · Veri/Analitik, Lojistik-IT, Üretim',
        'btn.email': 'E-posta',
        'btn.cv': 'CV / Özgeçmiş (PDF)',
        'btn.linkedin': 'LinkedIn',
        'btn.github': 'GitHub',
        'btn.blog': 'Blog',
        'btn.theme': 'Tema değiştir',
        'cards.fem': '2D elemanlarla demolar; DOF, küresel rijitlik, yer değiştirme & gerilme.',
        'cards.kpi': 'Lead time, picking accuracy, OEE; Python→pandas→viz; aksiyon alınabilir metrikler.',
        'cards.cad': 'Otomotiv parçaları; ölçülendirme, toleranslar, normlar; portföy.',
        'cards.portfolio': 'Portföy',
        'cards.repo': 'Repo / Demo',
        'cards.blogTitle': 'Blog / Notlar',
        'cards.blogTxt': 'IT in Produktion & Logistik üzerine kısa yazılar.'
      },
      de: {
        'nav.blog': 'Blog',
        'hero.title': 'Maschinenbau (ITPL) · Data & Logistics',
        'hero.subtitle': 'Werkstudent / Praktikum / Junior · Data/Analytics, Logistik-IT, Manufacturing',
        'btn.email': 'E-Mail',
        'btn.cv': 'CV / Lebenslauf (PDF)',
        'btn.linkedin': 'LinkedIn',
        'btn.github': 'GitHub',
        'btn.blog': 'Blog',
        'btn.theme': 'Thema wechseln',
        'cards.fem': 'Demos mit 2D-Elementen; DOF, globale Steifigkeit, Verschiebung & Spannung.',
        'cards.kpi': 'Lead Time, Picking Accuracy, OEE; Python→pandas→Viz; umsetzbare Metriken.',
        'cards.cad': 'Automotive-Teile; Bemaßung, Toleranzen, Normen; Portfolio.',
        'cards.portfolio': 'Portfolio',
        'cards.repo': 'Repo / Demo',
        'cards.blogTitle': 'Blog / Notizen',
        'cards.blogTxt': 'Kurztexte aus IT in Produktion & Logistik.'
      },
      en: {
        'nav.blog': 'Blog',
        'hero.title': 'Mechanical Eng. (ITPL) · Data & Logistics',
        'hero.subtitle': 'Werkstudent / Internship / Junior · Data/Analytics, Logistics IT, Manufacturing',
        'btn.email': 'E-mail',
        'btn.cv': 'CV / Resume (PDF)',
        'btn.linkedin': 'LinkedIn',
        'btn.github': 'GitHub',
        'btn.blog': 'Blog',
        'btn.theme': 'Toggle theme',
        'cards.fem': 'Demos with 2D elements; DOFs, global stiffness, displacement & stress.',
        'cards.kpi': 'Lead time, picking accuracy, OEE; Python→pandas→viz; actionable metrics.',
        'cards.cad': 'Automotive parts; dimensioning, tolerances, norms; portfolio.',
        'cards.portfolio': 'Portfolio',
        'cards.repo': 'Repo / Demo',
        'cards.blogTitle': 'Blog / Notes',
        'cards.blogTxt': 'Short posts from IT in Production & Logistics.'
      }
    },
    blog: {
      tr: {
        'blog.title': 'Blog',
        'blog.subtitle': 'Yazılarım ve notlarım',
        'blog.read': 'Oku',
        'blog.empty': 'Henüz yazı yok. _posts/ klasörüne bir Markdown dosyası ekle.',
        'blog.search': 'Ara…',
        'btn.theme': 'Tema değiştir'
      },
      de: {
        'blog.title': 'Blog',
        'blog.subtitle': 'Meine Beiträge und Notizen',
        'blog.read': 'Lesen',
        'blog.empty': 'Noch keine Beiträge. Lege eine Markdown-Datei in _posts/ ab.',
        'blog.search': 'Suchen…',
        'btn.theme': 'Thema wechseln'
      },
      en: {
        'blog.title': 'Blog',
        'blog.subtitle': 'My posts and notes',
        'blog.read': 'Read',
        'blog.empty': 'No posts yet. Add a Markdown file under _posts/.',
        'blog.search': 'Search…',
        'btn.theme': 'Toggle theme'
      }
    },
    dev: {
      tr: {
        'back.home': 'Anasayfa',
        'wip.title': 'Bu bölüm geliştirme aşamasında',
        'wip.subtitle': 'Yakında burada proje detayları ve demolar olacak.',
        'btn.theme': 'Tema değiştir'
      },
      de: {
        'back.home': 'Startseite',
        'wip.title': 'Dieser Bereich befindet sich im Aufbau',
        'wip.subtitle': 'Bald findest du hier Projektdetails und Demos.',
        'btn.theme': 'Thema wechseln'
      },
      en: {
        'back.home': 'Home',
        'wip.title': 'This section is under construction',
        'wip.subtitle': 'Project details and demos will appear here soon.',
        'btn.theme': 'Toggle theme'
      }
    },
    post: {
      tr: {
        'post.back': 'Blog',
        'btn.theme': 'Tema değiştir'
      },
      de: {
        'post.back': 'Blog',
        'btn.theme': 'Thema wechseln'
      },
      en: {
        'post.back': 'Blog',
        'btn.theme': 'Toggle theme'
      }
    }
  };

  global.I18N_STRINGS = DICT;
})(window);
